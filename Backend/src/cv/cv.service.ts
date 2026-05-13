import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { unlink } from 'fs/promises';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class CvService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(user: JwtPayload, file: Express.Multer.File) {
    const cleanup = async () => {
      await unlink(file.path).catch(() => undefined);
    };

    if (user.role !== Role.CANDIDATE) {
      await cleanup();
      throw new ForbiddenException('Solo un candidato puede subir su CV.');
    }

    const cvUrl = `/uploads/cv/${file.filename}`;

    const nameFallback = String(user.email || 'Candidato').split('@')[0] || 'Candidato';

    const candidateProfile = await this.prisma.candidateProfile
      .upsert({
        where: { userId: user.sub },
        update: { cvUrl },
        create: {
          userId: user.sub,
          name: nameFallback,
          skills: [],
          languages: [],
          cvUrl,
        },
        select: {
          id: true,
          userId: true,
          cvUrl: true,
          updatedAt: true,
        },
      })
      .catch(async (error: unknown) => {
        await cleanup();
        throw error;
      });

    return {
      cvUrl: candidateProfile.cvUrl,
      updatedAt: candidateProfile.updatedAt,
    };
  }
}
