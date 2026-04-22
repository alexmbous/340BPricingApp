
import { Roles } from '@apexcare/shared-types';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { buildOrganizationScope, canActOnParentOrganization } from '../../common/tenancy/tenant-scope';
import type { AuthActor } from '../../common/types/auth-actor';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export interface CreateOrganizationInput {
  name: string;
  isCoveredEntity340B?: boolean;
  covered340BId?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async listForActor(actor: AuthActor) {
    const scope = buildOrganizationScope(actor);
    return this.prisma.organization.findMany({
      where: 'organizationId' in scope ? { id: scope.organizationId } : (scope as object),
      orderBy: { name: 'asc' },
    });
  }

  async create(actor: AuthActor, parentOrganizationId: string, input: CreateOrganizationInput) {
    if (!canActOnParentOrganization(actor, parentOrganizationId)) {
      throw new ForbiddenException('Parent organization outside your scope');
    }
    const parent = await this.prisma.parentOrganization.findUnique({
      where: { id: parentOrganizationId },
    });
    if (!parent) throw new NotFoundException('Parent organization not found');

    return this.prisma.organization.create({
      data: {
        parentOrganizationId,
        name: input.name,
        isCoveredEntity340B: input.isCoveredEntity340B ?? false,
        covered340BId: input.covered340BId,
      },
    });
  }

  async createOrgAdmin(
    actor: AuthActor,
    organizationId: string,
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      title?: string;
    },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    // Guard should have validated scope, but defense in depth:
    if (actor.role === Roles.ORG_ADMIN && actor.organizationId !== organizationId) {
      throw new ForbiddenException();
    }

    return this.users.createUser({
      email: input.email,
      password: input.password,
      role: Roles.ORG_ADMIN,
      organizationId,
      parentOrganizationId: org.parentOrganizationId,
      adminProfile: { firstName: input.firstName, lastName: input.lastName, title: input.title },
    });
  }
}
