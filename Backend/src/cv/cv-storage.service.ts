import { InternalServerErrorException, Injectable, Logger } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../config/app-config.service';
import { S3Service } from '../aws/s3.service';

@Injectable()
export class CvStorageService {
  private readonly logger = new Logger(CvStorageService.name);
  private readonly keyPrefix: string;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly s3Service: S3Service,
  ) {
    const rawPrefix = this.appConfig.s3CvPrefix ?? 'cv';
    this.keyPrefix = rawPrefix.replace(/^\/+|\/+$/g, '');

    if (this.appConfig.s3Bucket) {
      this.logger.log(`Storage configurado con S3 (Bucket: ${this.appConfig.s3Bucket})`);
    } else {
      this.logger.warn('S3 no está configurado (falta S3_BUCKET). Se usará el almacenamiento local como fallback.');
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

  /**
   * Sanitiza una cadena para usarla como valor de Metadata en S3.
   * AWS SDK v3 lanza SignatureDoesNotMatch si los valores contienen
   * caracteres fuera del rango ASCII imprimible (0x20–0x7E).
   */
  private sanitizeMetadata(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // elimina diacríticos (tildes, etc.)
      .replace(/[^\x20-\x7E]/g, '')    // elimina cualquier otro no-ASCII
      .slice(0, 200) || 'CV.pdf';
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
    const bucket = this.appConfig.s3Bucket;

    // Si tenemos S3 configurado, intentamos usarlo
    if (bucket) {
      const objectKey = `${this.keyPrefix}/${safeUserId}/${fileName}`;
      try {
        await this.s3Service.client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: buffer,
            ContentType: 'application/pdf',
            Metadata: {
              // IMPORTANTE: los valores de Metadata deben ser ASCII puro
              originalname: this.sanitizeMetadata(file.originalname || 'CV.pdf'),
            },
          }),
        );

        this.logger.log(`CV subido con éxito a S3: ${objectKey}`);

        return {
          key: objectKey,
          url: this.buildPublicUrl(objectKey),
        };
      } catch (error: unknown) {
        const err = error as any;
        this.logger.error(
          `Error subiendo CV a S3: [${err.name}] ${err.message} (HTTP ${err.$metadata?.httpStatusCode})`,
        );
        // Fallback al almacenamiento local si S3 falla
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
      this.logger.warn(`CV guardado localmente en: ${filePath} (S3 no disponible o falló).`);

      return {
        key: path.join(safeUserId, fileName),
        url: localUrl,
      };
    } catch (error) {
      this.logger.error('Error guardando CV localmente:', error);
      throw new InternalServerErrorException('No se pudo guardar el CV localmente.');
    }
  }

  async getBufferFromUrl(url: string): Promise<Buffer> {
    const trimmed = String(url || '').trim();
    if (!trimmed) {
      throw new InternalServerErrorException('URL de CV vacía.');
    }

    const bucket = this.appConfig.s3Bucket;

    // Si es una URL de S3, intentamos descargarla usando el SDK (más seguro si el bucket es privado)
    if (bucket && (trimmed.includes('.amazonaws.com') || (this.appConfig.s3PublicBaseUrl && trimmed.startsWith(this.appConfig.s3PublicBaseUrl)))) {
      try {
        let objectKey = '';
        if (this.appConfig.s3PublicBaseUrl && trimmed.startsWith(this.appConfig.s3PublicBaseUrl)) {
          objectKey = trimmed.replace(this.appConfig.s3PublicBaseUrl, '').replace(/^\/+/, '');
        } else {
          // Extraer key de URL estándar de S3
          // https://bucket.s3.region.amazonaws.com/key o https://s3.region.amazonaws.com/bucket/key
          const urlObj = new URL(trimmed);
          const path = urlObj.pathname.replace(/^\/+/, '');
          if (trimmed.includes(`/${bucket}/`)) {
            objectKey = path.substring(path.indexOf(bucket) + bucket.length + 1);
          } else {
            objectKey = path;
          }
        }

        if (objectKey) {
          const response = await this.s3Service.client.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: decodeURIComponent(objectKey),
            }),
          );

          const streamToBuffer = async (stream: any): Promise<Buffer> => {
            return new Promise((resolve, reject) => {
              const chunks: any[] = [];
              stream.on('data', (chunk: any) => chunks.push(chunk));
              stream.on('error', reject);
              stream.on('end', () => resolve(Buffer.concat(chunks)));
            });
          };

          return await streamToBuffer(response.Body);
        }
      } catch (error) {
        this.logger.error(`Error descargando desde S3 (${trimmed}):`, error);
        // Fallback a fetch si falla la extracción de la key o el SDK
      }
    }

    // Fallback para URLs locales (/api/cv/file/...)
    if (trimmed.startsWith('/api/cv/file/') || trimmed.startsWith('/cv/file/')) {
      try {
        const parts = trimmed.split('/');
        const filename = parts.pop() || '';
        const userId = parts.pop() || '';
        const filePath = path.join(__dirname, '..', '..', 'uploads', 'cvs', userId, filename);
        return await fs.promises.readFile(filePath);
      } catch (error) {
        this.logger.error(`Error leyendo archivo local (${trimmed}):`, error);
        throw new InternalServerErrorException('No se pudo leer el archivo del CV local.');
      }
    }

    // Fallback genérico usando fetch (para URLs externas que no sean S3 o si falló lo anterior)
    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      this.logger.error(`Error en fetch final (${trimmed}):`, error.message);
      throw new InternalServerErrorException('No se pudo descargar el CV desde el almacenamiento.');
    }
  }
}
