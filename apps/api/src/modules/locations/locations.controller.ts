import { Controller, Get, Query, Version } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

import { LocationsService } from './locations.service';

class ResolveZipQueryDto {
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'Expected a 5-digit US ZIP (optionally ZIP+4)' })
  zip!: string;
}

@Controller('locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get('resolve-zip')
  @Version('1')
  async resolveZip(@Query() q: ResolveZipQueryDto) {
    return this.service.resolveZip(q.zip);
  }
}
