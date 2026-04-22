import { Roles } from '@apexcare/shared-types';
import { ForbiddenException, Injectable } from '@nestjs/common';


import type { AuthActor } from '../../common/types/auth-actor';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParentOrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string) {
    return this.prisma.parentOrganization.create({ data: { name } });
  }

  async list(actor: AuthActor) {
    if (actor.role === Roles.SUPER_ADMIN) {
      return this.prisma.parentOrganization.findMany({ orderBy: { name: 'asc' } });
    }
    if (actor.role === Roles.PARENT_ADMIN && actor.parentOrganizationId) {
      return this.prisma.parentOrganization.findMany({
        where: { id: actor.parentOrganizationId },
      });
    }
    throw new ForbiddenException();
  }
}
