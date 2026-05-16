import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { AppConfigService } from '../config/app-config.service';
import { S3Service } from '../aws/s3.service';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class PhotoStorageService {
  private readonly logger = new Logger(PhotoStorageService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly s3Service: S3Service,
  ) {}

  async uploadProfilePhoto(params: {
    userId: string;
    file: Express.Multer.File;
  }): Promise<{ url: string; key: string }> {
    const { userId, file } = params;

    const buffer = (file as any)?.buffer as Buffer | undefined;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestException('No se pudo leer la imagen en memoria.');
    }

    if (buffer.length > MAX_SIZE_BYTES) {
      throw new BadRequestException('La imagen supera el límite de 5MB.');
    }

    const mime = file.mimetype?.toLowerCase() ?? '';
    if (!ALLOWED_MIMES.includes(mime)) {
      throw new BadRequestException(
        `Formato de imagen no permitido: ${mime}. Se permiten JPG, PNG, WebP y GIF.`,
      );
    }

    // Determinar extensión
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const ext = extMap[mime] ?? 'jpg';

    const bucket = this.appConfig.s3Bucket;
    const safeUserId = String(userId || 'anon').trim() || 'anon';
    const fileId = randomUUID();
    const fileName = `${fileId}.${ext}`;
    const objectKey = `photos/${safeUserId}/${fileName}`;

    if (!bucket) {
      throw new InternalServerErrorException(
        'El almacenamiento S3 no está configurado (falta AWS_BUCKET_NAME en el .env).',
      );
    }

    try {
      await this.s3Service.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: mime,
          Metadata: {
            // IMPORTANTE: los valores de Metadata deben ser ASCII puro
            // (SignatureDoesNotMatch si se envían tildes u otros no-ASCII)
            originalname: String(file.originalname || 'photo')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^\x20-\x7E]/g, '')
              .slice(0, 200) || 'photo',
            userId: safeUserId,
          },
        }),
      );

      this.logger.log(`Foto subida con éxito a S3: ${objectKey}`);

      const url = this.buildPublicUrl(objectKey);
      return { url, key: objectKey };
    } catch (error: any) {
      this.logger.error(`Error subiendo foto a S3: [${error.name}] ${error.message}`);
      this.logger.error(`Código HTTP: ${error.$metadata?.httpStatusCode}, Código AWS: ${error.Code ?? error.code}`);
      throw new InternalServerErrorException(`Error al subir la foto a S3: [${error.name}] ${error.message}`);
    }
  }

  private buildPublicUrl(objectKey: string): string {
    if (this.appConfig.s3PublicBaseUrl) {
      const base = this.appConfig.s3PublicBaseUrl.replace(/\/+$/g, '');
      return `${base}/${objectKey}`;
    }

    const bucket = this.appConfig.s3Bucket ?? '';
    const region = this.appConfig.awsRegion;
    const encodedKey = encodeURIComponent(objectKey).replace(/%2F/g, '/');

    if (bucket.includes('.')) {
      return `https://s3.${region}.amazonaws.com/${bucket}/${encodedKey}`;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }
}
