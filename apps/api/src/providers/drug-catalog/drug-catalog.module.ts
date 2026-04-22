import { Module } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

import { DRUG_CATALOG_PROVIDER } from './drug-catalog.tokens';
import { MockDrugCatalogProvider } from './mock-drug-catalog.provider';

@Module({
  providers: [
    MockDrugCatalogProvider,
    {
      provide: DRUG_CATALOG_PROVIDER,
      inject: [AppConfigService, MockDrugCatalogProvider],
      useFactory: (config: AppConfigService, mock: MockDrugCatalogProvider) => {
        // v1: only mock is implemented. As real providers come online
        // (RxNavDrugCatalogProvider, vendor feed), branch here on
        // config.providersMode or a per-provider env switch.
        if (config.providersMode === 'mock') return mock;
        throw new Error('Live drug catalog provider not yet implemented');
      },
    },
  ],
  exports: [DRUG_CATALOG_PROVIDER],
})
export class DrugCatalogModule {}
