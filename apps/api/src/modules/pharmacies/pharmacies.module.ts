import { Module } from '@nestjs/common';

import { PharmacyDirectoryModule } from '../../providers/pharmacy-directory/pharmacy-directory.module';

import { PharmaciesController } from './pharmacies.controller';
import { PharmaciesService } from './pharmacies.service';

@Module({
  imports: [PharmacyDirectoryModule],
  controllers: [PharmaciesController],
  providers: [PharmaciesService],
  exports: [PharmaciesService],
})
export class PharmaciesModule {}
