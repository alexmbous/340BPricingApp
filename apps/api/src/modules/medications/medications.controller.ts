import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { DrugForms, type DrugForm } from '@apexcare/shared-types';

import { Audit } from '../../common/decorators/audit.decorator';

import { MedicationsService } from './medications.service';

class SearchQueryDto {
  @IsString() @MinLength(1) @MaxLength(100)
  name!: string;

  @IsOptional() @IsString() @MaxLength(50)
  strength?: string;

  @IsOptional() @IsEnum(DrugForms)
  form?: DrugForm;

  @IsOptional() @IsString()
  limit?: string;
}

@Controller('medications')
export class MedicationsController {
  constructor(private readonly service: MedicationsService) {}

  @Get('search')
  @Version('1')
  @Audit({ action: 'medication.searched', onlyOnSuccess: true })
  async search(@Query() q: SearchQueryDto) {
    return this.service.search({
      name: q.name,
      strength: q.strength,
      form: q.form,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Version('1')
  async getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
