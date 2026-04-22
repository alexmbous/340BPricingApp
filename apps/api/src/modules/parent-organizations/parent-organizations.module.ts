import { Module } from '@nestjs/common';

import { ParentOrganizationsController } from './parent-organizations.controller';
import { ParentOrganizationsService } from './parent-organizations.service';

@Module({
  controllers: [ParentOrganizationsController],
  providers: [ParentOrganizationsService],
  exports: [ParentOrganizationsService],
})
export class ParentOrganizationsModule {}
