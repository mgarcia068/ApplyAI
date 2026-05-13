import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import type { Request } from 'express';
import { extname, join } from 'path';
import { diskStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CvService } from './cv.service';

const CV_UPLOAD_DIR = join(__dirname, '..', '..', 'uploads', 'cv');

mkdirSync(CV_UPLOAD_DIR, { recursive: true });

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: CV_UPLOAD_DIR,
        filename: (
          req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const requestUser = (req as Request & { user?: JwtPayload }).user;
          const userPart = requestUser?.sub ?? 'anon';
          const fileId = randomUUID();
          const extension = extname(file.originalname || '').toLowerCase();
          const safeExt = extension === '.pdf' ? '.pdf' : '.pdf';
          cb(null, `${userPart}-${fileId}${safeExt}`);
        },
      }),
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
}
