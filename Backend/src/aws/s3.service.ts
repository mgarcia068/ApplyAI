import { Injectable, Logger } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class S3Service {
  public readonly client: S3Client;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly appConfig: AppConfigService) {
    const region = this.appConfig.awsRegion;
    const accessKeyId = this.appConfig.awsAccessKeyId;
    const secretAccessKey = this.appConfig.awsSecretAccessKey;

    this.logger.log(`Inicializando S3Client - región: ${region}, bucket: ${this.appConfig.s3Bucket}`);
    this.logger.log(`Credenciales - accessKeyId: ${accessKeyId ? `${accessKeyId.slice(0, 6)}...` : 'FALTA'}, secretAccessKey: ${secretAccessKey ? 'OK' : 'FALTA'}`);

    if (!accessKeyId || !secretAccessKey) {
      this.logger.error('CREDENCIALES AWS INCOMPLETAS. Revisá las variables AWS_ACCESS_KEY_ID (o AWS_ACCESS_KEY) y AWS_SECRET_ACCESS_KEY en el .env');
    }

    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }
}
