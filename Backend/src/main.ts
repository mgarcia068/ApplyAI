import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CONFIGURACIÓN TEMPORAL — mover/validar variables en Nivel 2 con ConfigService
  const frontendUrl = process.env.FRONTEND_URL;

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: frontendUrl ? [frontendUrl] : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
