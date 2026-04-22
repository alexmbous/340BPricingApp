import { Body, Controller, Get, Post, UseGuards, Version } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { Roles as RolesEnum } from '@apexcare/shared-types';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthActor } from '../../common/types/auth-actor';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';

import { ParentOrganizationsService } from './parent-organizations.service';

class CreateParentOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;
}

@Controller('parent-organizations')
@UseGuards(TenantScopeGuard)
export class ParentOrganizationsController {
  constructor(private readonly service: ParentOrganizationsService) {}

  @Post()
  @Version('1')
  @Roles(RolesEnum.SUPER_ADMIN)
  @Audit({ action: 'parent_organization.created', resourceType: 'parent_organization' })
  async create(@Body() dto: CreateParentOrganizationDto) {
    return this.service.create(dto.name);
  }

  @Get()
  @Version('1')
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.PARENT_ADMIN)
  async list(@CurrentUser() actor: AuthActor) {
    return this.service.list(actor);
  }
}
