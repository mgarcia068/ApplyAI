import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fromBuffer as detectFileTypeFromBuffer } from 'file-type';

import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CvStorageService } from './cv-storage.service';

@Injectable()
export class CvService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvStorageService: CvStorageService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async upload(params: { userId: string; email: string; file: Express.Multer.File }) {
    const { userId, email, file } = params;

    await this.assertPdfUpload(file);

    const uploaded = await this.cvStorageService.uploadCandidateCvPdf({
      userId,
      file,
    });

    const cvUrl = uploaded.url;

    const nameFallback = String(email || 'Candidato').split('@')[0] || 'Candidato';

    const candidateProfile = await this.prisma.candidateProfile
      .upsert({
        where: { userId },
        update: { 
          cvUrl,
          cvOriginalName: file.originalname || 'CV.pdf'
        },
        create: {
          userId,
          name: nameFallback,
          skills: [],
          languages: [],
          cvUrl,
          cvOriginalName: file.originalname || 'CV.pdf'
        },
        select: {
          id: true,
          userId: true,
          cvUrl: true,
          cvOriginalName: true,
          updatedAt: true,
        },
      })
      .catch((error: unknown) => {
        throw error;
      });

    return {
      cvUrl: candidateProfile.cvUrl,
      cvOriginalName: candidateProfile.cvOriginalName,
      updatedAt: candidateProfile.updatedAt,
    };
  }

  private async assertPdfUpload(file: Express.Multer.File): Promise<void> {
    const buffer = (file as any)?.buffer as Buffer | undefined;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new InternalServerErrorException(
        'No se pudo leer el archivo PDF en memoria. Verificá que el backend esté usando memoryStorage().',
      );
    }

    // Validación por magic numbers (no confiar en mimetype/originalname)
    const detected = await detectFileTypeFromBuffer(buffer).catch((error: unknown) => {
      console.error('Error detectando tipo de archivo por magic numbers:', error);
      return undefined;
    });

    // Fallback simple para PDFs si file-type no logra detectarlo.
    const header = buffer.subarray(0, 5).toString('ascii');
    const headerLooksPdf = header === '%PDF-';

    const isPdf = detected?.mime === 'application/pdf' || (!detected && headerLooksPdf);
    if (!isPdf) {
      throw new BadRequestException(
        'El archivo subido no parece ser un PDF válido (se valida por contenido, no por nombre o mimetype).',
      );
    }
  }

  async analyzeMyCv(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Debes completar tu perfil y subir tu CV primero.');
    }
    return this.analyze(profile.id);
  }

  async analyze(profileId: string) {
    // 1. Validar que el candidato tenga un perfil y un archivo de CV
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || !profile.cvUrl) {
      throw new NotFoundException('El candidato no tiene un CV subido.');
    }

    // 2. Extraer el texto del PDF
    let pdfText = '';
    try {
      const dataBuffer = await this.loadPdfBuffer(profile.cvUrl);
      const pdfData = await pdfParse(dataBuffer);
      pdfText = pdfData.text;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al intentar leer el archivo PDF.');
    }

    if (!pdfText.trim()) {
      throw new InternalServerErrorException('El PDF parece estar vacío o ser solo una imagen sin texto.');
    }

    // 3. Procesar el texto con Gemini IA
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      
      const prompt = `
        Eres un experto seleccionador de personal de IT y un Coach de Carrera. Lee el siguiente CV y realiza dos tareas: 
        1. Extraer los datos profesionales del perfil.
        2. Evaluar el documento (el CV como tal) para darle feedback constructivo al candidato sobre cómo mejorar su hoja de vida.

        Devuelve la información en formato JSON estricto con esta estructura:
        - "summary": Un resumen profesional de máximo 3 oraciones sobre la trayectoria.
        - "skills": Un array de strings con habilidades blandas y métodos de trabajo.
        - "technologies": Un array de strings listando únicamente tecnologías, lenguajes, frameworks o herramientas.
        - "experience": Un array de strings resumiendo su experiencia laboral.
        - "strengths": Un array de strings con 3 puntos fuertes DE ESTE DOCUMENTO CV (ej. "Estructura clara", "Buen uso de métricas", "Fácil lectura").
        - "weaknesses": Un array de strings con 3 críticas constructivas sobre CÓMO MEJORAR EL DOCUMENTO (ej. "Faltan logros cuantificables", "Descripciones muy largas", "Faltan enlaces a portfolio").
        - "overallScore": Un número del 1 al 100 que califique EXCLUSIVAMENTE la calidad de redacción, legibilidad y formato de este CV.

        Devuelve ÚNICAMENTE un objeto JSON válido, sin markdown, sin explicaciones extra.

        Texto del CV:
        """
        ${pdfText.substring(0, 10000)} 
        """
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      // Limpiar backticks de markdown que suele meter Gemini
      const jsonRaw = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      let parsedAiData;
      try {
        parsedAiData = JSON.parse(jsonRaw);
      } catch (parseError) {
        console.error('Error parseando JSON de Gemini. Raw Response:', responseText);
        throw new InternalServerErrorException('La IA no devolvió un formato JSON válido.');
      }

      // 4. Guardar en Base de Datos (Upsert para no duplicar si se analiza 2 veces)
      const cvAnalysis = await this.prisma.cvAnalysis.upsert({
        where: { candidateId: profile.id },
        update: {
          summary: parsedAiData.summary || null,
          skills: parsedAiData.skills || [],
          experience: parsedAiData.experience || [],
          technologies: parsedAiData.technologies || [],
          strengths: parsedAiData.strengths || [],
          weaknesses: parsedAiData.weaknesses || [],
          overallScore: parsedAiData.overallScore || null,
          rawResponse: jsonRaw,
        },
        create: {
          candidateId: profile.id,
          summary: parsedAiData.summary || null,
          skills: parsedAiData.skills || [],
          experience: parsedAiData.experience || [],
          technologies: parsedAiData.technologies || [],
          strengths: parsedAiData.strengths || [],
          weaknesses: parsedAiData.weaknesses || [],
          overallScore: parsedAiData.overallScore || null,
          rawResponse: jsonRaw,
        },
      });

      return cvAnalysis;
    } catch (error: any) {
      console.error('Error detallado con Gemini IA:', error?.message || error);
      throw new InternalServerErrorException(
        error?.message || 'Error al contactar a la IA o procesar el resultado.'
      );
    }
  }

  async getMyCvBuffer(userId: string): Promise<Buffer> {
    return this.getCvBufferForUser(userId);
  }

  async getCvBufferForUser(userId: string): Promise<Buffer> {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { cvUrl: true },
    });

    if (!profile || !profile.cvUrl) {
      throw new NotFoundException('El candidato no tiene un CV subido.');
    }

    return this.loadPdfBuffer(profile.cvUrl);
  }

  private async loadPdfBuffer(cvUrl: string): Promise<Buffer> {
    const trimmed = String(cvUrl || '').trim();
    if (!trimmed) {
      throw new NotFoundException('El candidato no tiene un CV subido.');
    }

    try {
      return await this.cvStorageService.getBufferFromUrl(trimmed);
    } catch (error: any) {
      console.error('Error al cargar PDF:', error.message);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        error.message || 'No se pudo descargar el CV desde el almacenamiento.'
      );
    }
  }
}
