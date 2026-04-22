import { Controller, Get, Query, Version } from '@nestjs/common';

import { ADMIN_ROLES } from '@apexcare/shared-types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthActor } from '../../common/types/auth-actor';

import { AuditService } from './audit.service';

@Controller({ path: 'audit' })
@Roles(...ADMIN_ROLES)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Version('1')
  async list(
    @CurrentUser() actor: AuthActor,
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.list(actor, {
      actorUserId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
