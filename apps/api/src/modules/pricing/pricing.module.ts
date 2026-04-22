import { Module } from '@nestjs/common';

import { PharmacyDirectoryModule } from '../../providers/pharmacy-directory/pharmacy-directory.module';
import { PricingProviderModule } from '../../providers/pricing/pricing.module';
import { EligibilityModule } from '../../providers/eligibility/eligibility.module';

import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [PricingProviderModule, PharmacyDirectoryModule, EligibilityModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
