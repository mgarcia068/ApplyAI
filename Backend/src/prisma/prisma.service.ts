import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Permite levantar el servidor aunque no esté configurada la DB todavía.
    // En MVP, si no hay DATABASE_URL, evitamos romper el arranque del backend.
    if (!process.env.DATABASE_URL) return;
    await this.$connect();
  }
}
