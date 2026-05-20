import { BadRequestException, Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { CvService } from '../cv/cv.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ApplicationsService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly anthropic?: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cvService: CvService,
    private readonly mailService: MailService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);

    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : undefined;
  }

  private async generateTextWithGemini(prompt: string): Promise<string> {
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
      max_tokens: 800,
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

  private async generateTextWithFallback(prompt: string): Promise<string> {
    try {
      return await this.generateTextWithGemini(prompt);
    } catch (error) {
      console.error('Gemini failed, attempting Anthropic fallback:', error);
      return await this.generateTextWithAnthropic(prompt);
    }
  }

  async create(user: JwtPayload, createApplicationDto: CreateApplicationDto) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: user.sub },
      include: { cvAnalysis: true },
    });

    if (!profile || !profile.cvUrl) {
      throw new BadRequestException('Debes completar tu perfil y subir tu CV antes de postularte.');
    }

    const job = await this.prisma.jobOffer.findUnique({
      where: { id: createApplicationDto.jobOfferId },
      include: {
        company: {
          include: { companyProfile: true }
        }
      }
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

    // 1. Asegurar que el CV esté analizado
    let cvAnalysis = profile.cvAnalysis;
    if (!cvAnalysis) {
      try {
        cvAnalysis = await this.cvService.analyze(profile.id);
      } catch (err) {
        console.error('Error al analizar el CV automáticamente al postularse:', err);
      }
    }

    // 2. Calcular el Match Score automáticamente
    let matchData: { score: number; pros: string[]; cons: string[] } | null = null;
    if (cvAnalysis) {
      matchData = await this._calculateMatchScore(cvAnalysis, job);
    }

    const application = await this.prisma.application.create({
      data: {
        candidateId: profile.id,
        jobOfferId: job.id,
        matchScore: matchData ? matchData.score : null,
        matchPros: matchData ? matchData.pros : [],
        matchCons: matchData ? matchData.cons : [],
      },
      include: {
        jobOffer: true,
      },
    });

    // Enviar correo de postulación asíncronamente
    this.mailService.sendNewApplication(
      profile.name,
      user.email,
      job.title,
      job.company?.companyProfile?.name || 'Empresa'
    ).catch(e => console.error(e));

    return application;
  }

  private async _calculateMatchScore(cvAnalysis: any, jobOffer: any): Promise<{ score: number; pros: string[]; cons: string[] } | null> {
    try {
      const prompt = `
        Eres un Reclutador Senior comparando un CV previamente analizado con una Oferta de Empleo.
        Calcula un grado de compatibilidad (Match Score) teniendo en cuenta las habilidades requeridas en el anuncio y la experiencia del candidato.

        OFERTA DE EMPLEO:
        - Título: ${jobOffer.title}
        - Descripción: ${jobOffer.description}
        - Habilidades requeridas: ${jobOffer.skillsRequired.join(', ')}
        - Experiencia mínima: ${jobOffer.minExperience} años

        DATOS EXTRAÍDOS DEL CANDIDATO:
        - Resumen Profesional: ${cvAnalysis.summary}
        - Competencias Tecnológicas: ${cvAnalysis.technologies.join(', ')}
        - Habilidades Blandas: ${cvAnalysis.skills.join(', ')}
        - Experiencia Laboral: ${cvAnalysis.experience.join(', ')}

        INSTRUCCIONES DE RESPUESTA:
        Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura. No envíes texto extra ni explicaciones fuera del JSON.
        {
          "score": 85,
          "pros": ["Tiene experiencia en React que es requerida", "Supera los años de experiencia mínima"],
          "cons": ["No menciona experiencia en Backend", "Falta detallar proyectos similares"]
        }
      `;

      const responseText = await this.generateTextWithFallback(prompt);
      
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');
        
        const data = JSON.parse(jsonMatch[0]);
        return {
          score: typeof data.score === 'number' ? data.score : 0,
          pros: Array.isArray(data.pros) ? data.pros : [],
          cons: Array.isArray(data.cons) ? data.cons : [],
        };
      } catch (e) {
        console.error('Error parseando JSON de match. Respuesta de la IA:', responseText);
        return null;
      }
    } catch (error) {
      console.error('Error calculando Score con Gemini:', error);
      return null;
    }
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

      const responseText = await this.generateTextWithFallback(prompt);
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

  async listByOffer(offerId: string, user: JwtPayload) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: offerId } });
    if (!job) throw new NotFoundException('Oferta no encontrada.');
    if (job.companyId !== user.sub) throw new ForbiddenException('No tienes permiso para ver estas postulaciones.');

    return this.prisma.application.findMany({
      where: { jobOfferId: offerId },
      include: {
        candidate: {
          include: {
            user: { select: { email: true, fullName: true } },
            cvAnalysis: true,
          },
        },
      },
      orderBy: { matchScore: 'desc' },
    });
  }

  async updateStatus(applicationId: string, status: any, user: JwtPayload) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { 
        jobOffer: {
          include: {
            company: {
              include: { companyProfile: true }
            }
          }
        },
        candidate: {
          include: {
            user: { select: { email: true, fullName: true } },
          },
        },
      },
    });

    if (!application) throw new NotFoundException('Postulación no encontrada.');
    if (application.jobOffer.companyId !== user.sub) throw new ForbiddenException('No tienes permiso.');

    const updatedApp = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status },
      include: {
        candidate: {
          include: {
            user: { select: { email: true, fullName: true } },
          },
        },
      },
    });

    // Enviar email asíncronamente si el estado es VIEWED (Entrevista) o REJECTED
    if (status === 'VIEWED') {
      this.mailService.sendApplicationAccepted(
        application.candidate.user.fullName || application.candidate.name,
        application.candidate.user.email,
        application.jobOffer.title,
        application.jobOffer.company.companyProfile?.name || 'Empresa',
        application.jobOffer.company.email
      ).catch(e => console.error(e));
    } else if (status === 'REJECTED') {
      this.mailService.sendApplicationRejected(
        application.candidate.user.fullName || application.candidate.name,
        application.candidate.user.email,
        application.jobOffer.title,
        application.jobOffer.company.companyProfile?.name || 'Empresa'
      ).catch(e => console.error(e));
    }

    return updatedApp;
  }

  async withdrawByOffer(offerId: string, user: JwtPayload) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: user.sub },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de candidato no encontrado.');
    }

    const application = await this.prisma.application.findUnique({
      where: {
        candidateId_jobOfferId: {
          candidateId: profile.id,
          jobOfferId: offerId,
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Postulación no encontrada.');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('No puedes despostularte de esta oferta.');
    }

    return this.prisma.application.delete({
      where: { id: application.id },
    });
  }
}
