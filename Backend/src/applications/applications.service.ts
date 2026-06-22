import { BadRequestException, Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CvService } from '../cv/cv.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cvService: CvService,
    private readonly mailService: MailService,
  ) {}

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
    } else {
      // Si tampoco hay análisis de CV disponible (y la IA falla al crearlo), al menos comparamos contra las skills del perfil
      const candidateSkills = profile.skills || [];
      const requiredSkills = job.skillsRequired || [];
      let matchCount = 0;
      requiredSkills.forEach((req: string) => {
        if (candidateSkills.some(cand => req.toLowerCase().includes(cand.toLowerCase()) || cand.toLowerCase().includes(req.toLowerCase()))) {
          matchCount++;
        }
      });
      matchData = {
        score: requiredSkills.length > 0 ? Math.round((matchCount / requiredSkills.length) * 100) : 50,
        pros: ["Evaluación basada únicamente en el perfil (Sin análisis de CV)"],
        cons: ["Sugerimos analizar el CV a fondo para un resultado más preciso"]
      };
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

      const responseText = await this.cvService.generateTextWithFallback(prompt);
      
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');
        
        const data = JSON.parse(jsonMatch[0]);
        return this.normalizeMatchData(data);
      } catch (e) {
        console.error('Error parseando JSON de match. Respuesta de la IA:', responseText);
        return this.calculateHeuristicMatch(cvAnalysis, jobOffer);
      }
    } catch (error: any) {
      console.error('Error calculando Score con proveedores de IA, usando algoritmo de respaldo:', error?.message || error);
      return this.calculateHeuristicMatch(cvAnalysis, jobOffer);
      
      // ALGORITMO HEURÍSTICO DE RESPALDO SI FALLAN LAS APIS DE IA
      const requiredSkills = (jobOffer.skillsRequired || []).map((s: string) => s.toLowerCase().trim());
      const candidateSkills = [
        ...(cvAnalysis.technologies || []),
        ...(cvAnalysis.skills || [])
      ].map((s: string) => s.toLowerCase().trim());

      let matchCount = 0;
      const matched: string[] = [];
      const missed: string[] = [];

      requiredSkills.forEach((req: string) => {
        const found = candidateSkills.some((cand: string) => req.includes(cand) || cand.includes(req));
        if (found) {
          matchCount++;
          matched.push(req);
        } else {
          missed.push(req);
        }
      });

      const score = requiredSkills.length > 0 
        ? Math.round((matchCount / requiredSkills.length) * 100) 
        : 50;

      return {
        score,
        pros: matched.length > 0 
          ? [`Coincide en habilidades clave: ${matched.join(', ')}`] 
          : ["Evaluación básica (IA no disponible)"],
        cons: missed.length > 0 
          ? [`Falta evidencia clara en: ${missed.join(', ')}`] 
          : ["No se detectaron faltantes críticos respecto a lo requerido."]
      };
    }
  }

  private normalizeMatchData(data: any): { score: number; pros: string[]; cons: string[] } {
    const scoreAsNumber = Number(data?.score);
    const score = Number.isFinite(scoreAsNumber)
      ? Math.min(100, Math.max(0, Math.round(scoreAsNumber)))
      : 0;

    const pros = this.normalizeTextArray(data?.pros);
    const cons = this.normalizeTextArray(data?.cons);

    return {
      score,
      pros: pros.length ? pros : ['La IA no detallo puntos fuertes especificos para este match.'],
      cons: cons.length ? cons : ['La IA no detallo puntos debiles especificos para este match.'],
    };
  }

  private normalizeTextArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  private calculateHeuristicMatch(cvAnalysis: any, jobOffer: any): { score: number; pros: string[]; cons: string[] } {
    // Ultimo respaldo: solo se usa cuando todos los proveedores de IA fallan o no devuelven JSON valido.
    const requiredSkills = (jobOffer.skillsRequired || [])
      .map((s: string) => s.toLowerCase().trim())
      .filter(Boolean);
    const candidateSkills = [
      ...(cvAnalysis.technologies || []),
      ...(cvAnalysis.skills || []),
    ]
      .map((s: string) => s.toLowerCase().trim())
      .filter(Boolean);

    let matchCount = 0;
    const matched: string[] = [];
    const missed: string[] = [];

    requiredSkills.forEach((req: string) => {
      const found = candidateSkills.some((cand: string) => req.includes(cand) || cand.includes(req));
      if (found) {
        matchCount++;
        matched.push(req);
      } else {
        missed.push(req);
      }
    });

    const score = requiredSkills.length > 0
      ? Math.round((matchCount / requiredSkills.length) * 100)
      : 50;

    return {
      score,
      pros: matched.length > 0
        ? [`Coincide en habilidades clave: ${matched.join(', ')}`]
        : ['Evaluacion basica: no se encontraron coincidencias claras en habilidades requeridas.'],
      cons: missed.length > 0
        ? [`Falta evidencia clara en: ${missed.join(', ')}`]
        : ['No se detectaron faltantes criticos respecto a lo requerido.'],
    };
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
      const matchData = await this._calculateMatchScore(candidate.cvAnalysis, jobOffer);

      if (!matchData) {
        throw new Error('La IA no pudo calcular el match correctamente');
      }

      const updatedApp = await this.prisma.application.update({
        where: { id: applicationId },
        data: { 
          matchScore: matchData.score,
          matchPros: matchData.pros,
          matchCons: matchData.cons
        },
        include: {
          candidate: {
            include: { cvAnalysis: true } // Devolvemos todo el análisis como pidió el requerimiento
          }
        }
      });

      return updatedApp;

    } catch (error: any) {
        console.error('Error calculando Score con proveedores de IA:', error?.message || error);
        throw new InternalServerErrorException('Error al contactar a los proveedores de IA para establecer el Match.');
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
    let mailSent: boolean | null = null;
    if (status === 'VIEWED') {
      mailSent = await this.mailService.sendApplicationAccepted(
        application.candidate.user.fullName || application.candidate.name,
        application.candidate.user.email,
        application.jobOffer.title,
        application.jobOffer.company.companyProfile?.name || 'Empresa',
        application.jobOffer.company.email
      );
    } else if (status === 'REJECTED') {
      mailSent = await this.mailService.sendApplicationRejected(
        application.candidate.user.fullName || application.candidate.name,
        application.candidate.user.email,
        application.jobOffer.title,
        application.jobOffer.company.companyProfile?.name || 'Empresa'
      );
    }

    return { ...updatedApp, mailSent };
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
