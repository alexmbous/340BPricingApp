import { Module } from '@nestjs/common';

import { DrugCatalogModule } from '../../providers/drug-catalog/drug-catalog.module';

import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';

@Module({
  imports: [DrugCatalogModule],
  controllers: [MedicationsController],
  providers: [MedicationsService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
