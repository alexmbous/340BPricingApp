import type { AuthUserSummary } from '@apexcare/shared-types';
import { Body, Controller, Get, HttpCode, Post, Req, Version } from '@nestjs/common';
import type { Request } from 'express';


import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthActor } from '../../common/types/auth-actor';
import { PrismaService } from '../../prisma/prisma.service';

import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('auth/login')
  @Version('1')
  @Audit({ action: 'auth.login' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @Public()
  @Post('auth/refresh')
  @Version('1')
  @Audit({ action: 'auth.refresh' })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @Public()
  @Post('auth/logout')
  @HttpCode(204)
  @Version('1')
  @Audit({ action: 'auth.logout' })
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Post('auth/password')
  @HttpCode(204)
  @Version('1')
  @Audit({ action: 'auth.password.changed' })
  async changePassword(@CurrentUser() actor: AuthActor, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(actor.userId, dto.currentPassword, dto.newPassword);
  }

  @Get('me')
  @Version('1')
  async me(@CurrentUser() actor: AuthActor): Promise<AuthUserSummary> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.userId },
      include: { adminProfile: true, patientProfile: true },
    });
    return this.auth.summarize(user);
  }
}
