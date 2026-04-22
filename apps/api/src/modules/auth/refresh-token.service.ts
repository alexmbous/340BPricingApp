import { randomBytes, createHash } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';

const REFRESH_BYTES = 48;

export interface IssuedRefreshToken {
  token: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  id: string;
}

export interface RefreshRotationInput {
  presentedToken: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async issue(params: {
    userId: string;
    familyId?: string;
    deviceLabel?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<IssuedRefreshToken> {
    const token = randomBytes(REFRESH_BYTES).toString('base64url');
    const tokenHash = hash(token);
    const familyId = params.familyId ?? uuidv4();
    const expiresAt = addDuration(new Date(), this.config.jwtRefreshTtl);

    const row = await this.prisma.refreshToken.create({
      data: {
        userId: params.userId,
        tokenHash,
        familyId,
        deviceLabel: params.deviceLabel,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        expiresAt,
      },
    });

    return { token, tokenHash, familyId, expiresAt, id: row.id };
  }

  /**
   * Validates a presented refresh token and rotates it. Implements
   * reuse-detection: if the presented token is already revoked, revoke
   * the entire family — the token was stolen and used twice.
   */
  async rotate(input: RefreshRotationInput): Promise<{ userId: string; issued: IssuedRefreshToken }> {
    const tokenHash = hash(input.presentedToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (existing.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    if (existing.revokedAt) {
      // Reuse detected — nuke the family so a thief can't keep rolling.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        message: 'Refresh token reuse detected; session revoked',
        code: 'REFRESH_REUSE',
      });
    }

    const issued = await this.issue({
      userId: existing.userId,
      familyId: existing.familyId,
      deviceLabel: existing.deviceLabel ?? undefined,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: issued.id },
    });

    return { userId: existing.userId, issued };
  }

  async revoke(presentedToken: string): Promise<void> {
    const tokenHash = hash(presentedToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function hash(token: string): string {
  // Fast, deterministic — refresh tokens are high-entropy random strings,
  // so argon2 is overkill here; SHA-256 is the standard pattern.
  return createHash('sha256').update(token).digest('hex');
}

// Parses a simple TTL string like "30d", "15m", "24h". Minimal, intentional.
function addDuration(from: Date, spec: string): Date {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(spec.trim());
  if (!match) throw new Error(`Invalid TTL: ${spec}`);
  const n = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return new Date(from.getTime() + n * (multipliers[unit] ?? 0));
}
