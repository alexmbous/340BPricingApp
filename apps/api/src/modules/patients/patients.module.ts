import { Module } from '@nestjs/common';

import { PricingProviderModule } from '../../providers/pricing/pricing.module';
import { UsersModule } from '../users/users.module';

import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [UsersModule, PricingProviderModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
