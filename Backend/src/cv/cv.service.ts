import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { fromBuffer as detectFileTypeFromBuffer } from 'file-type';

import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CvStorageService } from './cv-storage.service';

@Injectable()
export class CvService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly anthropic?: Anthropic;
  private readonly geminiApiKey?: string;
  private readonly gptApiKey?: string;
  private readonly xaiApiKey?: string;
  private readonly groqApiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvStorageService: CvStorageService,
    private readonly configService: ConfigService,
  ) {
    const geminiKey = this.getOptionalConfig('GEMINI_API_KEY');
    this.geminiApiKey = geminiKey;
    this.genAI = new GoogleGenerativeAI(geminiKey || '');

    const anthropicKey = this.getOptionalConfig('ANTHROPIC_API_KEY');
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : undefined;

    this.gptApiKey = this.getOptionalConfig('GPT_API_KEY');
    this.xaiApiKey = this.getOptionalConfig('XAI_API_KEY');
    this.groqApiKey = this.getOptionalConfig('GROQ_API_KEY');
  }

  private getOptionalConfig(key: string): string | undefined {
    const value = this.configService.get<string>(key);
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private async generateTextWithGemini(prompt: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured.');
    }
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  private async generateTextWithAnthropic(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured.');
    }

    const result = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    let text = '';
    for (const block of result.content) {
      if (block.type === 'text') {
        text += block.text;
      }
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Anthropic returned empty response.');
    }

    return trimmed;
  }

  private async generateTextWithGpt(prompt: string): Promise<string> {
    if (!this.gptApiKey) {
      throw new Error('GPT API key not configured.');
    }

    return this.generateTextWithOpenAiCompatible({
      provider: 'GPT',
      apiKey: this.gptApiKey,
      url: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      maxTokens: 1500,
      temperature: 0.2,
      prompt,
    });
  }

  private async generateTextWithXai(prompt: string): Promise<string> {
    if (!this.xaiApiKey) {
      throw new Error('XAI API key not configured.');
    }

    return this.generateTextWithOpenAiCompatible({
      provider: 'XAI',
      apiKey: this.xaiApiKey,
      url: 'https://api.x.ai/v1/chat/completions',
      model: 'grok-3-mini',
      maxTokens: 1500,
      temperature: 0.2,
      prompt,
    });
  }

  private async generateTextWithGroq(prompt: string): Promise<string> {
    if (!this.groqApiKey) {
      throw new Error('Groq API key not configured.');
    }

    return this.generateTextWithOpenAiCompatible({
      provider: 'GROQ',
      apiKey: this.groqApiKey,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 1500,
      temperature: 0.2,
      prompt,
    });
  }

  private async generateTextWithOpenAiCompatible(options: {
    provider: string;
    apiKey: string;
    url: string;
    model: string;
    maxTokens: number;
    temperature: number;
    prompt: string;
  }): Promise<string> {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: options.prompt }],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      const errorBody = await this.safeReadJson(response);
      throw this.buildProviderError(options.provider, response.status, errorBody);
    }

    const data = await response.json().catch(() => undefined);
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error(`${options.provider} returned empty response.`);
    }

    return text;
  }

  private async safeReadJson(response: { json: () => Promise<any> }): Promise<any> {
    try {
      return await response.json();
    } catch (_) {
      return undefined;
    }
  }

  private buildProviderError(provider: string, status: number, body: any): Error {
    const message =
      body?.error?.message ||
      body?.message ||
      `${provider} request failed with status ${status}.`;
    const code = body?.error?.code || body?.code;

    const error = new Error(message);
    (error as any).provider = provider;
    (error as any).status = status;
    if (code) (error as any).code = code;
    if (body) (error as any).raw = body;
    return error;
  }

  private isTokensExhausted(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || error?.raw?.error?.code || '').toLowerCase();
    const type = String(error?.raw?.error?.type || '').toLowerCase();
    const status = Number(
      error?.status || error?.statusCode || error?.response?.status || error?.raw?.status,
    );

    const hints = ['insufficient', 'quota', 'exceeded', 'token', 'billing', 'credit'];
    const hasHint = hints.some((hint) =>
      message.includes(hint) || code.includes(hint) || type.includes(hint),
    );

    return (status === 402 || status === 429) && hasHint;
  }

  private async generateTextWithFallback(prompt: string): Promise<string> {
    const attempts: Array<{ name: string; fn: () => Promise<string> }> = [];

    if (this.geminiApiKey) attempts.push({ name: 'Gemini', fn: () => this.generateTextWithGemini(prompt) });
    if (this.groqApiKey) attempts.push({ name: 'Groq', fn: () => this.generateTextWithGroq(prompt) });
    if (this.anthropic) attempts.push({ name: 'Anthropic', fn: () => this.generateTextWithAnthropic(prompt) });
    if (this.gptApiKey) attempts.push({ name: 'GPT', fn: () => this.generateTextWithGpt(prompt) });
    if (this.xaiApiKey) attempts.push({ name: 'XAI', fn: () => this.generateTextWithXai(prompt) });

    if (!attempts.length) {
      throw new Error('No AI providers configured.');
    }

    let tokenIssue = false;
    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        return await attempt.fn();
      } catch (error) {
        tokenIssue = tokenIssue || this.isTokensExhausted(error);
        lastError = error;
        console.error(`${attempt.name} failed:`, error);
      }
    }

    if (tokenIssue) {
      const error = new Error('AI_TOKENS_EXHAUSTED');
      (error as any).code = 'AI_TOKENS_EXHAUSTED';
      throw error;
    }

    throw (lastError || new Error('All AI providers failed.')) as Error;
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

    console.log(`\n\n--- INICIO PDF EXTRAIDO (${profile.id}) ---`);
    console.log(pdfText.substring(0, 300) + '...');
    console.log(`--- FIN PDF EXTRAIDO ---\n\n`);

    // 3. Procesar el texto con IA (con fallback entre proveedores)
    try {
      const prompt = `
        Eres un experto seleccionador de personal de IT y un Coach de Carrera. Lee el siguiente CV y realiza dos tareas: 
        1. Extraer los datos profesionales del perfil.
        2. Evaluar el documento (el CV como tal) para darle feedback constructivo al candidato sobre cómo mejorar su hoja de vida.

        Devuelve la información en formato JSON estricto con esta estructura:
        - "summary": Un resumen profesional de máximo 3 oraciones sobre la trayectoria.
        - "skills": Un array de strings con habilidades blandas y métodos de trabajo.
        - "technologies": Un array de strings listando únicamente tecnologías, lenguajes, frameworks o herramientas.
        - "experience": Un array de strings resumiendo su experiencia laboral.
        - "strengths": Un array de strings con 3 puntos fuertes DE ESTE DOCUMENTO CV basandote en la estructura y claridad.
        - "weaknesses": Un array de strings con 3 críticas constructivas reales sobre CÓMO MEJORAR EL DOCUMENTO.
        - "overallScore": Un número del 1 al 100 que califique EXCLUSIVAMENTE la calidad de redacción, legibilidad y formato de este CV.

        Devuelve ÚNICAMENTE un objeto JSON válido, sin markdown, sin explicaciones extra.

        Texto del CV:
        """
        ${pdfText.substring(0, 10000)} 
        """
      `;

      const responseText = await this.generateTextWithFallback(prompt);
      
      // Limpiar backticks de markdown que suele meter Gemini
      const jsonRaw = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      let parsedAiData;
      try {
        parsedAiData = JSON.parse(jsonRaw);
      } catch (parseError) {
        console.error('Error parseando JSON de IA. Raw Response:', responseText);
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
      console.error('Error detallado con IA:', error?.message || error);
      if (error?.code === 'AI_TOKENS_EXHAUSTED' || this.isTokensExhausted(error)) {
        throw new HttpException(
          {
            message: 'No hay tokens disponibles para analizar el CV en este momento. Intentá más tarde.',
            errorCode: 'AI_TOKENS_EXHAUSTED',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
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
