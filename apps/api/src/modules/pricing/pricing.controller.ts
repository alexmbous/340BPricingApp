import { Body, Controller, Post, Version } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthActor } from '../../common/types/auth-actor';

import { PricingService } from './pricing.service';

class LocationDto {
  @IsLatitude()
  @Type(() => Number)
  lat!: number;

  @IsLongitude()
  @Type(() => Number)
  lng!: number;

  @IsNumber()
  @Min(0.5)
  @Max(50)
  @Type(() => Number)
  radiusMiles!: number;
}

class PricingCompareDto {
  @IsString()
  @MinLength(1)
  rxcui!: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  @Type(() => Number)
  limit?: number;
}

@Controller('pricing')
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Post('compare')
  @Version('1')
  async compare(@CurrentUser() actor: AuthActor, @Body() dto: PricingCompareDto) {
    return this.service.compare(actor, {
      rxcui: dto.rxcui,
      location: dto.location,
      patientId: dto.patientId,
      quantity: dto.quantity,
      limit: dto.limit ?? 10,
    });
  }
}
