import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';
import { AppConfigModule } from './config/app-config.module';
import { JobsModule } from './jobs/jobs.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Permite correr el backend desde `Backend/` leyendo variables de `Backend/.env`
      // o desde la raíz del repo leyendo `./.env` o `./Backend/.env`.
      envFilePath: ['.env', 'Backend/.env', '../.env'],
    }),
    AppConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    JobsModule,
    ApplicationsModule,
    CvModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
