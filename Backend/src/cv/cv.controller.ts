import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CvService } from './cv.service';

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CANDIDATE)
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: memoryStorage(),
      limits: {
        fileSize: 3 * 1024 * 1024, // 3MB
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
        if (mimeOk || nameOk) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Sólo se permiten archivos PDF'), false);
        }
      },
    }),
  )
  upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Seleccioná un archivo PDF para subir.');
    }

    return this.cvService.upload({
      userId: user.sub,
      email: user.email,
      file,
    });
  }

  @Post('analyze/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CANDIDATE)
  analyzeMe(@CurrentUser() user: JwtPayload) {
    return this.cvService.analyzeMyCv(user.sub);
  }

  @Post('analyze/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  analyze(@Param('id') id: string) {
    return this.cvService.analyze(id);
  }

  @Get('file/:userId/:filename')
  serveFile(
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '');
    
    // Ruta donde se guardan los CVs locales (Backend/uploads/cvs)
    const filePath = join(__dirname, '..', '..', 'uploads', 'cvs', safeUserId, safeFilename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const fileStream = createReadStream(filePath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeFilename}"`,
    });
    
    return new StreamableFile(fileStream);
  }
}
