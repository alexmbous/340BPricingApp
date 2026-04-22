import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import { IsNumberString, IsOptional } from 'class-validator';

import { PharmaciesService } from './pharmacies.service';

class NearbyQueryDto {
  @IsNumberString() lat!: string;
  @IsNumberString() lng!: string;
  @IsOptional() @IsNumberString() radiusMiles?: string;
  @IsOptional() @IsNumberString() limit?: string;
}

@Controller('pharmacies')
export class PharmaciesController {
  constructor(private readonly service: PharmaciesService) {}

  @Get('nearby')
  @Version('1')
  async nearby(@Query() q: NearbyQueryDto) {
    return this.service.nearby(
      parseFloat(q.lat),
      parseFloat(q.lng),
      q.radiusMiles ? parseFloat(q.radiusMiles) : 10,
      q.limit ? parseInt(q.limit, 10) : 20,
    );
  }

  @Get(':id')
  @Version('1')
  async getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
