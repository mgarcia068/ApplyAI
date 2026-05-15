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

  async findCompanyOffers(companyId: string): Promise<JobOffer[]> {
    return this.prisma.jobOffer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async update(id: string, updateJobDto: any, companyId: string): Promise<JobOffer> {
    const job = await this.prisma.jobOffer.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`JobOffer with ID ${id} not found`);
    }
    if (job.companyId !== companyId) {
      throw new NotFoundException(`JobOffer not found or not owned by you`);
    }

    return this.prisma.jobOffer.update({
      where: { id },
      data: updateJobDto,
    });
  }

  async remove(id: string, companyId: string): Promise<void> {
    const job = await this.prisma.jobOffer.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`JobOffer with ID ${id} not found`);
    }
    if (job.companyId !== companyId) {
      throw new NotFoundException(`JobOffer not found or not owned by you`);
    }

    await this.prisma.jobOffer.delete({
      where: { id },
    });
  }
}
