import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Roles } from '@apexcare/shared-types';

import type { AuthActor } from '../../../common/types/auth-actor';
import {
  TENANT_SCOPE_KEY,
  type TenantScopeOptions,
} from '../../../common/decorators/tenant-scope.decorator';
import {
  actorCanReachOrganization,
  canActOnParentOrganization,
} from '../../../common/tenancy/tenant-scope';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Validates that the authenticated actor's tenancy envelope covers the
 * target resource indicated by the route params.
 *
 * This is a secondary gate. Service methods should STILL build queries
 * using buildOrganizationScope() — defense in depth.
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<TenantScopeOptions | undefined>(
      TENANT_SCOPE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!opts) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: AuthActor; params: Record<string, string> }>();
    const actor = req.user;
    if (!actor) throw new ForbiddenException('Not authenticated');

    const allowBypass = opts.superAdminBypass !== false;
    if (allowBypass && actor.role === Roles.SUPER_ADMIN) return true;

    if (opts.organizationParam) {
      const orgId = req.params[opts.organizationParam];
      if (!orgId) throw new ForbiddenException('Missing organization id');
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, parentOrganizationId: true },
      });
      if (!org) throw new NotFoundException('Organization not found');
      if (!actorCanReachOrganization(actor, org.id, org.parentOrganizationId)) {
        throw new ForbiddenException('Organization outside your scope');
      }
      return true;
    }

    if (opts.parentOrganizationParam) {
      const id = req.params[opts.parentOrganizationParam];
      if (!id) throw new ForbiddenException('Missing parent organization id');
      if (!canActOnParentOrganization(actor, id)) {
        throw new ForbiddenException('Parent organization outside your scope');
      }
      return true;
    }

    if (opts.patientParam) {
      const patientId = req.params[opts.patientParam];
      if (!patientId) throw new ForbiddenException('Missing patient id');
      const patient = await this.prisma.patientProfile.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          userId: true,
          organizationId: true,
          organization: { select: { parentOrganizationId: true } },
        },
      });
      if (!patient) throw new NotFoundException('Patient not found');

      // Patients can only act on their own record
      if (actor.role === Roles.PATIENT) {
        if (patient.userId !== actor.userId) {
          throw new ForbiddenException('Patients can only act on their own record');
        }
        return true;
      }
      if (
        !actorCanReachOrganization(
          actor,
          patient.organizationId,
          patient.organization.parentOrganizationId,
        )
      ) {
        throw new ForbiddenException('Patient outside your scope');
      }
      return true;
    }

    return true;
  }
}
