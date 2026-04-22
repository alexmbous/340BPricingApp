import type {
  AuthTokenPair,
  AuthUserSummary,
  LoginRequest,
  LoginResponse,
  Role,
} from '@apexcare/shared-types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';


import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';

import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: Role;
  parentOrganizationId: string | null;
  organizationId: string | null;
  jti: string;
}

export interface LoginContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async login(req: LoginRequest, ctx: LoginContext): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: req.email.toLowerCase() },
      include: { adminProfile: true, patientProfile: true },
    });

    if (!user || user.disabledAt) {
      // Same error path for missing/disabled to reduce enumeration signal
      await this.password.verify(
        '$argon2id$v=19$m=19456,t=2,p=1$aaaaaaaaaaaaaaaa$bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        req.password,
      );
      throw new UnauthorizedException({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const ok = await this.password.verify(user.passwordHash, req.password);
    if (!ok) {
      throw new UnauthorizedException({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const { accessToken, accessTokenExpiresAt } = await this.issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      parentOrganizationId: user.parentOrganizationId,
      organizationId: user.organizationId,
      jti: uuidv4(),
    });

    const refresh = await this.refreshTokens.issue({
      userId: user.id,
      deviceLabel: req.deviceLabel,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
      user: this.summarize(user),
    };
  }

  async refresh(
    presentedRefreshToken: string,
    ctx: LoginContext,
  ): Promise<AuthTokenPair> {
    const { userId, issued } = await this.refreshTokens.rotate({
      presentedToken: presentedRefreshToken,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.disabledAt) {
      throw new UnauthorizedException({ message: 'Account unavailable', code: 'ACCOUNT_DISABLED' });
    }

    const { accessToken, accessTokenExpiresAt } = await this.issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      parentOrganizationId: user.parentOrganizationId,
      organizationId: user.organizationId,
      jti: uuidv4(),
    });

    return {
      accessToken,
      refreshToken: issued.token,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: issued.expiresAt.toISOString(),
    };
  }

  async logout(presentedRefreshToken: string): Promise<void> {
    await this.refreshTokens.revoke(presentedRefreshToken);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await this.password.verify(user.passwordHash, currentPassword);
    if (!ok) {
      throw new UnauthorizedException({ message: 'Current password incorrect', code: 'INVALID_CREDENTIALS' });
    }
    const nextHash = await this.password.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: nextHash } });
    await this.refreshTokens.revokeAllForUser(userId);
  }

  summarize(user: {
    id: string;
    email: string;
    role: Role;
    parentOrganizationId: string | null;
    organizationId: string | null;
    adminProfile: { firstName: string; lastName: string } | null;
    patientProfile: { firstName: string; lastName: string } | null;
  }): AuthUserSummary {
    const profile = user.adminProfile ?? user.patientProfile;
    const displayName = profile ? `${profile.firstName} ${profile.lastName}` : user.email;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      parentOrganizationId: user.parentOrganizationId,
      organizationId: user.organizationId,
      displayName,
    };
  }

  private async issueAccessToken(
    claims: AccessTokenClaims,
  ): Promise<{ accessToken: string; accessTokenExpiresAt: Date }> {
    const accessToken = await this.jwt.signAsync(claims, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessTtl,
    });
    // Decode the generated token to report expiry consistent with signOptions
    const decoded = this.jwt.decode(accessToken) as { exp?: number } | null;
    const expMs = decoded?.exp ? decoded.exp * 1000 : Date.now() + 15 * 60_000;
    return { accessToken, accessTokenExpiresAt: new Date(expMs) };
  }
}
