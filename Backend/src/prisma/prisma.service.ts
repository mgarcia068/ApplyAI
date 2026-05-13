import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly appConfig: AppConfigService) {
    super();
  }

  async onModuleInit() {
    console.log('[PrismaService] URL cargada de DATABASE_URL:', process.env.DATABASE_URL);
    if (!process.env.DATABASE_URL) {
      console.error('[PrismaService] ERROR CRÍTICO: No hay DATABASE_URL en process.env!');
    }
    // Permite levantar el servidor aunque la DB no esté levantada todavía.
    // Para el MVP, preferimos no tumbar el backend si Postgres no está disponible.
    if (!this.appConfig.databaseUrl) return;
    try {
      await this.$connect();
    } catch {
      // TODO (Nivel 2): loggear con Logger + fail-fast en producción.
    }
  }
}
