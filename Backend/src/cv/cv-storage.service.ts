import { InternalServerErrorException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class CvStorageService {
  private readonly bucket: string | undefined;
  private readonly region: string;
  private readonly publicBaseUrl: string | undefined;
  private readonly keyPrefix: string;
  private readonly s3: S3Client | undefined;

  constructor(private readonly configService: ConfigService) {
    this.bucket =
      this.getOptional('S3_BUCKET') ??
      // Compatibilidad con nombres usados en .env existentes
      this.getOptional('AWS_BUCKET_NAME') ??
      this.getOptional('AWS_BUCKET');
    this.region =
      this.getOptional('S3_REGION') ??
      this.getOptional('AWS_REGION') ??
      // Default razonable (útil para MinIO / LocalStack / AWS por defecto)
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

    // Fallback: endpoint clásico de AWS. Nota: para buckets con puntos puede ser preferible setear S3_PUBLIC_BASE_URL.
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
    if (!this.bucket || !this.s3) {
      throw new InternalServerErrorException(
        'Storage de CV no configurado. Definí la variable de entorno S3_BUCKET (y opcionalmente S3_REGION, S3_PUBLIC_BASE_URL).',
      );
    }

    const bucket = this.bucket;
    const s3 = this.s3;

    const { userId, file } = params;

    const buffer = (file as any)?.buffer as Buffer | undefined;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new InternalServerErrorException(
        'No se pudo leer el archivo PDF en memoria. Verificá que el backend esté usando memoryStorage().',
      );
    }

    const safeUserId = String(userId || 'anon').trim() || 'anon';
    const fileId = randomUUID();
    const objectKey = `${this.keyPrefix}/${safeUserId}/${fileId}.pdf`;

    await s3
      .send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: 'application/pdf',
          Metadata: {
            originalname: String(file.originalname || 'CV.pdf').slice(0, 200),
          },
        }),
      )
      .catch((error: unknown) => {
        console.error('Error subiendo CV a S3:', error);
        throw new InternalServerErrorException('No se pudo subir el CV al almacenamiento en la nube.');
      });

    return {
      key: objectKey,
      url: this.buildPublicUrl(objectKey),
    };
  }
}
