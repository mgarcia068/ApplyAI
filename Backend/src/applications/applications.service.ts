import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateApplicationDto } from './dto/create-application.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
