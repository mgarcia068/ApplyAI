import 'reflect-metadata';
import * as dns from 'dns';

// Forzar el uso de IPv4 por defecto para evitar problemas de conexión SMTP (ENETUNREACH) en Render
dns.setDefaultResultOrder('ipv4first');
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Aumentar el límite para permitir el envío de fotos en base64 (photoUrl)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const appConfig = app.get(AppConfigService);

  app.setGlobalPrefix('api');

  // Nota: CVs y archivos se almacenan en Cloud Storage (S3). Mantener el backend stateless.
  const frontendUrls = appConfig.frontendUrls;
  app.enableCors({
    // Si FRONTEND_URL existe, restringimos a ese/estos origins.
    // Caso contrario, dejamos abierto para desarrollo.
    origin: frontendUrls?.length ? frontendUrls : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(appConfig.port);
}

bootstrap();
