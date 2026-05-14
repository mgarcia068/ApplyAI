import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
