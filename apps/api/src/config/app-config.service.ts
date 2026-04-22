import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppEnv } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  get nodeEnv(): AppEnv['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }
  get port(): number {
    return this.config.get('PORT', { infer: true });
  }
  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get jwtAccessSecret(): string {
    return this.config.get('JWT_ACCESS_SECRET', { infer: true });
  }
  get jwtRefreshSecret(): string {
    return this.config.get('JWT_REFRESH_SECRET', { infer: true });
  }
  get jwtAccessTtl(): string {
    return this.config.get('JWT_ACCESS_TTL', { infer: true });
  }
  get jwtRefreshTtl(): string {
    return this.config.get('JWT_REFRESH_TTL', { infer: true });
  }

  get providersMode(): 'mock' | 'live' {
    return this.config.get('PROVIDERS_MODE', { infer: true });
  }

  get corsOrigins(): string[] | boolean {
    const raw = this.config.get('CORS_ORIGINS', { infer: true });
    if (!raw) return this.isProduction ? false : true;
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  get logLevel(): AppEnv['LOG_LEVEL'] {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get auditEnforceAppendOnly(): boolean {
    return this.config.get('AUDIT_ENFORCE_APPEND_ONLY', { infer: true });
  }
}
