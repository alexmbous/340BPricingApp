import { Module } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

import { MockPricingProvider } from './mock-pricing.provider';
import { PRICING_PROVIDER } from './pricing.tokens';

@Module({
  providers: [
    MockPricingProvider,
    {
      provide: PRICING_PROVIDER,
      inject: [AppConfigService, MockPricingProvider],
      useFactory: (config: AppConfigService, mock: MockPricingProvider) => {
        if (config.providersMode === 'mock') return mock;
        throw new Error('Live pricing provider not yet implemented');
      },
    },
  ],
  exports: [PRICING_PROVIDER],
})
export class PricingProviderModule {}
