import { Module } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

import { LOCATION_RESOLVER_PROVIDER } from './location-resolver.tokens';
import { MockLocationResolverProvider } from './mock-location-resolver.provider';

@Module({
  providers: [
    MockLocationResolverProvider,
    {
      provide: LOCATION_RESOLVER_PROVIDER,
      inject: [AppConfigService, MockLocationResolverProvider],
      useFactory: (config: AppConfigService, mock: MockLocationResolverProvider) => {
        if (config.providersMode === 'mock') return mock;
        throw new Error('Live location resolver provider not yet implemented');
      },
    },
  ],
  exports: [LOCATION_RESOLVER_PROVIDER],
})
export class LocationResolverModule {}
