import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    const value = this.config.get<string>('PORT');
    const parsed = value ? Number(value) : 3000;
    return Number.isFinite(parsed) ? parsed : 3000;
  }

  get frontendUrl(): string | undefined {
    return this.config.get<string>('FRONTEND_URL') || undefined;
  }
}
