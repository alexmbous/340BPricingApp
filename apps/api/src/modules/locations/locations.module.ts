import { Module } from '@nestjs/common';

import { LocationResolverModule } from '../../providers/location-resolver/location-resolver.module';

import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [LocationResolverModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
