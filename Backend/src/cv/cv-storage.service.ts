import { InternalServerErrorException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CvStorageService {
  private readonly logger = new Logger(CvStorageService.name);
  private readonly bucket: string | undefined;
  private readonly region: string;
  private readonly publicBaseUrl: string | undefined;
  private readonly keyPrefix: string;
  private readonly s3: S3Client | undefined;

  constructor(private readonly configService: ConfigService) {
    this.bucket =
      this.getOptional('S3_BUCKET') ??
      this.getOptional('AWS_BUCKET_NAME') ??
      this.getOptional('AWS_BUCKET');
    
    this.region =
      this.getOptional('S3_REGION') ??
      this.getOptional('AWS_REGION') ??
      'us-east-1';

    this.publicBaseUrl = this.getOptional('S3_PUBLIC_BASE_URL');

    const rawPrefix = this.getOptional('S3_CV_PREFIX') ?? 'cv';
    this.keyPrefix = rawPrefix.replace(/^\/+|\/+$/g, '');

    const endpoint = this.getOptional('S3_ENDPOINT');
    const forcePathStyle = this.parseOptionalBool(this.getOptional('S3_FORCE_PATH_STYLE'));

    const accessKeyId = this.getOptional('AWS_ACCESS_KEY_ID') ?? this.getOptional('AWS_ACCESS_KEY');
    const secretAccessKey = this.getOptional('AWS_SECRET_ACCESS_KEY');
    const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

    if (this.bucket) {
      this.s3 = new S3Client({
        region: this.region,
        ...(credentials ? { credentials } : {}),
        ...(endpoint ? { endpoint } : {}),
        ...(forcePathStyle !== undefined ? { forcePathStyle } : {}),
      });
      this.logger.log(`Storage configurado con S3 (Bucket: ${this.bucket})`);
    } else {
      this.logger.warn('S3 no está configurado. Se usará el almacenamiento local como fallback en uploads/cvs/');
    }
  }

  private getOptional(key: string): string | undefined {
    const value = this.configService.get<string>(key);
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private parseOptionalBool(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined;

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;

    return undefined;
  }

  private buildPublicUrl(objectKey: string): string {
    if (this.publicBaseUrl) {
      const base = this.publicBaseUrl.replace(/\/+$/g, '');
      return `${base}/${objectKey}`;
    }

    const bucket = this.bucket ?? '';
    const region = this.region;
    const encodedKey = encodeURIComponent(objectKey).replace(/%2F/g, '/');

    if (bucket.includes('.')) {
      return `https://s3.${region}.amazonaws.com/${bucket}/${encodedKey}`;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }

  async uploadCandidateCvPdf(params: {
    userId: string;
    file: Express.Multer.File;
  }): Promise<{ url: string; key: string }> {
    const { userId, file } = params;

    const buffer = (file as any)?.buffer as Buffer | undefined;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new InternalServerErrorException(
        'No se pudo leer el archivo PDF en memoria. Verificá que el backend esté usando memoryStorage().',
      );
    }

    const safeUserId = String(userId || 'anon').trim() || 'anon';
    const fileId = randomUUID();
    const fileName = `${fileId}.pdf`;

    // Si tenemos S3, intentamos usarlo
    if (this.bucket && this.s3) {
      const objectKey = `${this.keyPrefix}/${safeUserId}/${fileName}`;
      try {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
            Body: buffer,
            ContentType: 'application/pdf',
            Metadata: {
              originalname: String(file.originalname || 'CV.pdf').slice(0, 200),
            },
          }),
        );

        return {
          key: objectKey,
          url: this.buildPublicUrl(objectKey),
        };
      } catch (error: unknown) {
        this.logger.error(`Error subiendo CV a S3, reintentando con almacenamiento local: ${(error as Error).message}`);
        // No lanzamos error, dejamos que siga al flujo local de abajo
      }
    }

    // Fallback: almacenamiento local
    const baseUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'cvs');
    const userDir = path.join(baseUploadsDir, safeUserId);
    
    try {
      await fs.promises.mkdir(userDir, { recursive: true });
      const filePath = path.join(userDir, fileName);
      await fs.promises.writeFile(filePath, buffer);
      
      const localUrl = `/api/cv/file/${safeUserId}/${fileName}`;
      return {
        key: path.join(safeUserId, fileName),
        url: localUrl,
      };
    } catch (error) {
      console.error('Error guardando CV localmente:', error);
      throw new InternalServerErrorException('No se pudo guardar el CV localmente.');
    }
  }
}
