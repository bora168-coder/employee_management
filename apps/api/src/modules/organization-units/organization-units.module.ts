import { Global, Module } from '@nestjs/common';
import { OrganizationUnitsController } from './organization-units.controller';
import { OrganizationUnitsService } from './organization-units.service';

@Global()
@Module({
  controllers: [OrganizationUnitsController],
  providers: [OrganizationUnitsService],
  exports: [OrganizationUnitsService],
})
export class OrganizationUnitsModule {}
