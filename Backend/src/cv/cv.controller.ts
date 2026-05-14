import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CvService } from './cv.service';

@Controller('cv')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: 3 * 1024 * 1024, // 3MB
        files: 1,
      },
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const mimeOk = file.mimetype === 'application/pdf';
        const nameOk = String(file.originalname || '')
          .toLowerCase()
          .endsWith('.pdf');
        cb(null, mimeOk || nameOk);
      },
    }),
  )
  upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const file = files?.[0];

    if (!file) {
      throw new BadRequestException('Seleccioná un archivo PDF para subir.');
    }

    if (files.length > 1) {
      throw new BadRequestException('Solo se permite subir 1 archivo PDF.');
    }

    return this.cvService.upload(user, file);
  }

  @Post('analyze/me')
  @Roles(Role.CANDIDATE)
  analyzeMe(@CurrentUser() user: JwtPayload) {
    // El candidato analiza su propio CV, por lo que buscamos primero su candidateId
    return this.cvService.analyzeMyCv(user.sub);
  }

  @Post('analyze/:id')
  @Roles(Role.COMPANY)
  analyze(@Param('id') id: string) {
    return this.cvService.analyze(id);
  }
}
