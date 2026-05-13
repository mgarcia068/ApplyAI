import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private getOptional(key: string): string | undefined {
    const value = this.config.get<string>(key);
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  get port(): number {
    const value = this.getOptional('PORT');
    const parsed = value ? Number(value) : 3000;
    return Number.isFinite(parsed) ? parsed : 3000;
  }

  /**
   * CORS: soporta 1 URL o múltiples separadas por coma.
   * Ej: "http://localhost:5500,http://127.0.0.1:5500"
   */
  get frontendUrls(): string[] | undefined {
    const value = this.getOptional('FRONTEND_URL');
    if (!value) return undefined;

    const urls = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return urls.length ? urls : undefined;
  }

  get databaseUrl(): string | undefined {
    return this.getOptional('DATABASE_URL');
  }

  get jwtSecret(): string | undefined {
    return this.getOptional('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.getOptional('JWT_EXPIRES_IN') ?? '7d';
  }

  get anthropicApiKey(): string | undefined {
    return this.getOptional('ANTHROPIC_API_KEY');
  }
}
