import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobOffer } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, createJobDto: CreateJobDto): Promise<JobOffer> {
    const existingUser = await this.prisma.user.findUnique({ where: { id: companyId } });
    
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${companyId} not found`);
    }

    return this.prisma.jobOffer.create({
      data: {
        ...createJobDto,
        companyId,
      },
    });
  }

  async findAll(): Promise<JobOffer[]> {
    return this.prisma.jobOffer.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        company: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<JobOffer> {
    const job = await this.prisma.jobOffer.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`JobOffer with ID ${id} not found`);
    }

    return job;
  }
}
