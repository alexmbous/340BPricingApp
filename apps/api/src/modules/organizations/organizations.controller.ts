import { Body, Controller, Get, Param, Post, UseGuards, Version } from '@nestjs/common';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Roles as RolesEnum } from '@apexcare/shared-types';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantScope } from '../../common/decorators/tenant-scope.decorator';
import type { AuthActor } from '../../common/types/auth-actor';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';

import { OrganizationsService } from './organizations.service';

class CreateOrganizationDto {
  @IsString() @MinLength(2) @MaxLength(200)
  name!: string;

  @IsOptional() @IsBoolean()
  isCoveredEntity340B?: boolean;

  @IsOptional() @IsString() @MaxLength(50)
  covered340BId?: string;
}

class CreateOrgAdminDto {
  @IsEmail()
  email!: string;

  @IsString() @MinLength(10) @MaxLength(200)
  password!: string;

  @IsString() @MinLength(1) @MaxLength(80)
  firstName!: string;

  @IsString() @MinLength(1) @MaxLength(80)
  lastName!: string;

  @IsOptional() @IsString() @MaxLength(100)
  title?: string;
}

@Controller()
@UseGuards(TenantScopeGuard)
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get('organizations')
  @Version('1')
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.PARENT_ADMIN, RolesEnum.ORG_ADMIN)
  async list(@CurrentUser() actor: AuthActor) {
    return this.service.listForActor(actor);
  }

  @Post('parent-organizations/:parentId/organizations')
  @Version('1')
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.PARENT_ADMIN)
  @TenantScope({ parentOrganizationParam: 'parentId' })
  @Audit({ action: 'organization.created', resourceType: 'organization' })
  async create(
    @CurrentUser() actor: AuthActor,
    @Param('parentId') parentId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.service.create(actor, parentId, dto);
  }

  @Post('organizations/:organizationId/admins')
  @Version('1')
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.PARENT_ADMIN, RolesEnum.ORG_ADMIN)
  @TenantScope({ organizationParam: 'organizationId' })
  @Audit({ action: 'user.created', resourceType: 'user' })
  async createAdmin(
    @CurrentUser() actor: AuthActor,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateOrgAdminDto,
  ) {
    return this.service.createOrgAdmin(actor, organizationId, dto);
  }
}
