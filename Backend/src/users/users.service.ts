import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { JwtPayload } from '../auth/types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FilterCandidatesDto } from './dto/filter-candidates.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(user: JwtPayload) {
    const userData = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        candidateProfile: {
          include: {
            cvAnalysis: true,
          },
        },
      },
    });

    if (!userData) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { password, ...result } = userData;
    return result;
  }

  async updateProfile(user: JwtPayload, dto: UpdateProfileDto) {
    const { fullName, name, location, bio, education, experience, skills, languages, cvUrl, cvOriginalName, photoUrl } = dto;

    // Update user info
    if (fullName !== undefined) {
      await this.prisma.user.update({
        where: { id: user.sub },
        data: { fullName },
      });
    }

    // If candidate, update/create candidate profile
    if (user.role === Role.CANDIDATE) {
      const candidateProfileData: any = {};
      if (name !== undefined) candidateProfileData.name = name;
      if (location !== undefined) candidateProfileData.location = location;
      if (bio !== undefined) candidateProfileData.bio = bio;
      if (education !== undefined) candidateProfileData.education = education;
      if (experience !== undefined) candidateProfileData.experience = experience;
      if (skills !== undefined) candidateProfileData.skills = skills;
      if (languages !== undefined) candidateProfileData.languages = languages;
      if (cvUrl !== undefined) candidateProfileData.cvUrl = cvUrl;
      if (cvOriginalName !== undefined) candidateProfileData.cvOriginalName = cvOriginalName;
      if (photoUrl !== undefined) candidateProfileData.photoUrl = photoUrl;

      // Check if profile exists to determine if we need to provide `name` for creation
      const existingProfile = await this.prisma.candidateProfile.findUnique({
        where: { userId: user.sub },
      });

      if (!existingProfile) {
        // Find user to get full name for default name if not provided
        const currentUser = await this.prisma.user.findUnique({
          where: { id: user.sub },
        });
        
        await this.prisma.candidateProfile.create({
          data: {
            userId: user.sub,
            name: name || currentUser?.fullName || user.email.split('@')[0],
            ...candidateProfileData,
          },
        });
      } else if (Object.keys(candidateProfileData).length > 0) {
        await this.prisma.candidateProfile.update({
          where: { userId: user.sub },
          data: candidateProfileData,
        });
      }
    }

    return this.me(user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { candidateProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role !== Role.CANDIDATE) {
      throw new ForbiddenException('Solo se pueden ver perfiles de candidatos');
    }

    const { password, ...result } = user;
    return result;
  }

  async findAllCandidates(filters: FilterCandidatesDto) {
    const { skills, location } = filters;

    const whereClause: any = {
      role: Role.CANDIDATE,
    };

    if (skills || location) {
      whereClause.candidateProfile = {};
      if (skills) {
        whereClause.candidateProfile.skills = {
          hasSome: skills.split(',').map((s) => s.trim()),
        };
      }
      if (location) {
        whereClause.candidateProfile.location = {
          contains: location,
          mode: 'insensitive',
        };
      }
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      include: { candidateProfile: true },
    });

    return users.map((user) => {
      const { password, ...result } = user;
      return result;
    });
  }

  async deleteAccount(user: JwtPayload) {
    await this.prisma.user.delete({
      where: { id: user.sub },
    });
  }
}
