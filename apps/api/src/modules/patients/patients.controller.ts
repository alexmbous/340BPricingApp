import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Version } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Roles as RolesEnum } from '@apexcare/shared-types';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantScope } from '../../common/decorators/tenant-scope.decorator';
import type { AuthActor } from '../../common/types/auth-actor';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';

import { PatientsService } from './patients.service';

class CreatePatientDto {
  @IsEmail()
  email!: string;

  @IsString() @MinLength(10) @MaxLength(200)
  password!: string;

  @IsString() @MinLength(1) @MaxLength(80)
  firstName!: string;

  @IsString() @MinLength(1) @MaxLength(80)
  lastName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsOptional() @IsString()
  preferredPharmacyId?: string;
}

class UpdatePatientDto {
  @IsOptional() @IsString() @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() preferredPharmacyId?: string | null;
  @IsOptional() @IsBoolean() eligibility340BAsserted?: boolean;
}

class AssignMedicationDto {
  @IsString()
  medicationId!: string;

  @IsOptional() @IsInt() @Min(1) @Max(10000) @Type(() => Number)
  quantity?: number;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

@Controller()
@UseGuards(TenantScopeGuard)
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  // ── Self ─────────────────────────────────────────────────────
  @Get('me/patient-profile')
  @Version('1')
  @Roles(RolesEnum.PATIENT)
  async getSelf(@CurrentUser() actor: AuthActor) {
    return this.service.getSelf(actor);
  }

  @Get('me/medications')
  @Version('1')
  @Roles(RolesEnum.PATIENT)
  @Audit({ action: 'pricing.lookup', resourceType: 'medication', onlyOnSuccess: true })
  async getSelfMedicationsWithPrices(@CurrentUser() actor: AuthActor) {
    return this.service.getSelfMedicationsWithPrices(actor);
  }

  // ── List / create under an organization ──────────────────────
  @Get('organizations/:organizationId/patients')
  @Version('1')
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.PARENT_ADMIN, RolesEnum.ORG_ADMIN)
  @TenantScope({ organizationParam: 'organizationId' })
  async list(
    @CurrentUser() actor: AuthActor,
    @Param('organizationId') organizationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.service.list(
      actor,
      organizationId,
      cursor,
      limit ? parseInt(limit, 10) : undefined,
      q,
    );
  }

  @Post('organizations/:organizationId/patients')
  @Version('1')
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.PARENT_ADMIN, RolesEnum.ORG_ADMIN)
  @TenantScope({ organizationParam: 'organizationId' })
  @Audit({ action: 'patient.created', resourceType: 'patient' })
  async create(
    @CurrentUser() actor: AuthActor,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreatePatientDto,
  ) {
    return this.service.create(actor, organizationId, dto);
  }

  // ── Patient-scoped routes ────────────────────────────────────
  @Get('patients/:id')
  @Version('1')
  @TenantScope({ patientParam: 'id' })
  async get(@CurrentUser() actor: AuthActor, @Param('id') id: string) {
    return this.service.get(actor, id);
  }

  @Patch('patients/:id')
  @Version('1')
  @TenantScope({ patientParam: 'id' })
  @Audit({ action: 'patient.updated', resourceType: 'patient' })
  async update(@CurrentUser() actor: AuthActor, @Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.service.update(actor, id, dto);
  }

  @Get('patients/:id/medications')
  @Version('1')
  @TenantScope({ patientParam: 'id' })
  async listMedications(@CurrentUser() actor: AuthActor, @Param('id') id: string) {
    return this.service.listMedications(actor, id);
  }

  @Post('patients/:id/medications')
  @Version('1')
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.PARENT_ADMIN, RolesEnum.ORG_ADMIN)
  @TenantScope({ patientParam: 'id' })
  @Audit({ action: 'patient.medication.assigned', resourceType: 'patient_medication' })
  async assignMedication(
    @CurrentUser() actor: AuthActor,
    @Param('id') id: string,
    @Body() dto: AssignMedicationDto,
  ) {
    return this.service.assignMedication(actor, id, dto);
  }
}
