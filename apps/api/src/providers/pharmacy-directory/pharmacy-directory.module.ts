import { Module } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

import { MockPharmacyDirectoryProvider } from './mock-pharmacy-directory.provider';
import { PHARMACY_DIRECTORY_PROVIDER } from './pharmacy-directory.tokens';

@Module({
  providers: [
    MockPharmacyDirectoryProvider,
    {
      provide: PHARMACY_DIRECTORY_PROVIDER,
      inject: [AppConfigService, MockPharmacyDirectoryProvider],
      useFactory: (config: AppConfigService, mock: MockPharmacyDirectoryProvider) => {
        if (config.providersMode === 'mock') return mock;
        throw new Error('Live pharmacy directory provider not yet implemented');
      },
    },
  ],
  exports: [PHARMACY_DIRECTORY_PROVIDER],
})
export class PharmacyDirectoryModule {}
