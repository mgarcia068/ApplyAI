import { BadRequestException, Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateApplicationDto } from './dto/create-application.dto';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ApplicationsService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async create(user: JwtPayload, createApplicationDto: CreateApplicationDto) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: user.sub },
    });

    if (!profile) {
      throw new BadRequestException('Debes completar tu perfil y subir tu CV antes de postularte.');
    }

    const job = await this.prisma.jobOffer.findUnique({
      where: { id: createApplicationDto.jobOfferId },
    });

    if (!job) {
      throw new NotFoundException('La oferta de trabajo no existe.');
    }
    
    if (!job.isActive) {
      throw new BadRequestException('La oferta de trabajo ya no está activa.');
    }

    const existingApplication = await this.prisma.application.findUnique({
      where: {
        candidateId_jobOfferId: {
          candidateId: profile.id,
          jobOfferId: job.id,
        },
      },
    });

    if (existingApplication) {
      throw new BadRequestException('Ya te has postulado a esta oferta de trabajo.');
    }

    const application = await this.prisma.application.create({
      data: {
        candidateId: profile.id,
        jobOfferId: job.id,
      },
      include: {
        jobOffer: true,
      },
    });

    return application;
  }

  async listMine(user: JwtPayload) {
    if (user.role === Role.CANDIDATE) {
      const profile = await this.prisma.candidateProfile.findUnique({
        where: { userId: user.sub },
      });

      if (!profile) return [];

      return this.prisma.application.findMany({
        where: { candidateId: profile.id },
        include: {
          jobOffer: {
            select: {
              id: true,
              title: true,
              companyId: true,
              location: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (user.role === Role.COMPANY) {
      return this.prisma.application.findMany({
        where: {
          jobOffer: {
            companyId: user.sub,
          },
        },
        include: {
          candidate: true,
          jobOffer: {
            select: {
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return [];
  }

  async evaluateMatch(applicationId: string, user: JwtPayload) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        jobOffer: true,
        candidate: {
          include: {
            cvAnalysis: true,
          }
        }
      }
    });

    if (!application) {
      throw new NotFoundException('Postulación no encontrada.');
    }

    // Seguridad: la empresa que evalúa debe ser la dueña del aviso
    if (application.jobOffer.companyId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para evaluar esta postulación.');
    }

    const { jobOffer, candidate } = application;

    if (!candidate.cvAnalysis || candidate.cvAnalysis.skills.length === 0) {
      throw new BadRequestException('El CV del candidato aún no ha sido analizado profundamente por la plataforma. Hazlo primero antes de obtener un Match Score.');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

      const prompt = `
        Eres un Reclutador Senior comparando un CV previamente analizado con una Oferta de Empleo.
        Calcula un grado de compatibilidad (Match Score) teniendo en cuenta las habilidades requeridas en el anuncio y la experiencia del candidato.

        OFERTA DE EMPLEO:
        - Título: ${jobOffer.title}
        - Descripción: ${jobOffer.description}
        - Habilidades requeridas: ${jobOffer.skillsRequired.join(', ')}
        - Experiencia mínima: ${jobOffer.minExperience} años

        DATOS EXTRAÍDOS DEL CANDIDATO:
        - Resumen Profesional: ${candidate.cvAnalysis.summary}
        - Competencias Tecnológicas: ${candidate.cvAnalysis.technologies.join(', ')}
        - Habilidades Blandas: ${candidate.cvAnalysis.skills.join(', ')}
        - Experiencia Laboral: ${candidate.cvAnalysis.experience.join(', ')}

        INSTRUCCIONES DE RESPUESTA:
        Devuelve ÚNICAMENTE un número entero del 1 al 100 que represente el porcentaje de compatibilidad. No envíes texto extra ni explicaciones, SOLO el número numérico, por ejemplo: 85
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const score = parseInt(responseText, 10);

      if (isNaN(score)) {
        throw new Error('La IA no devolvió un número válido');
      }

      const updatedApp = await this.prisma.application.update({
        where: { id: applicationId },
        data: { matchScore: score },
        include: {
          candidate: {
            include: { cvAnalysis: true } // Devolvemos todo el análisis como pidió el requerimiento
          }
        }
      });

      return updatedApp;

    } catch (error: any) {
        console.error('Error calculando Score con Gemini:', error?.message || error);
        throw new InternalServerErrorException('Error al contactar a la IA Gemini para establecer el Match.');
    }
  }
}
