import { Controller, Get, Patch, Post, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { PhotoStorageService } from './photo-storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FilterCandidatesDto } from './dto/filter-candidates.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly photoStorageService: PhotoStorageService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.usersService.me(user);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user, dto);
  }

  @Post('me/photo')
  @Roles(Role.CANDIDATE, Role.COMPANY)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype?.toLowerCase())) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten imágenes JPG, PNG, WebP o GIF'), false);
        }
      },
    }),
  )
  async uploadPhoto(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Seleccioná una imagen para subir.');
    }
    const { url } = await this.photoStorageService.uploadProfilePhoto({ userId: user.sub, file });
    // Actualizar el perfil con la nueva URL
    await this.usersService.updateProfile(user, { photoUrl: url });
    return { photoUrl: url };
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@CurrentUser() user: JwtPayload) {
    return this.usersService.deleteAccount(user);
  }

  @Get()
  @Roles(Role.COMPANY)
  findAllCandidates(@Query() filters: FilterCandidatesDto) {
    return this.usersService.findAllCandidates(filters);
  }

  @Get(':id')
  @Roles(Role.COMPANY)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
