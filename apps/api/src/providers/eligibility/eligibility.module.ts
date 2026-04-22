import { Module } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

import { ClinicAssertionEligibilityProvider } from './clinic-assertion-eligibility.provider';
import { ELIGIBILITY_PROVIDER } from './eligibility.tokens';

@Module({
  providers: [
    ClinicAssertionEligibilityProvider,
    {
      provide: ELIGIBILITY_PROVIDER,
      inject: [AppConfigService, ClinicAssertionEligibilityProvider],
      useFactory: (config: AppConfigService, clinic: ClinicAssertionEligibilityProvider) => {
        // v1: single implementation — defers to the doctor office's stored
        // assertion plus the organization's contract-pharmacy network.
        // Swap for a TPA-backed provider when one is available.
        if (config.providersMode === 'mock') return clinic;
        return clinic;
      },
    },
  ],
  exports: [ELIGIBILITY_PROVIDER],
})
export class EligibilityModule {}
