import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('provinces')
  provinces() {
    return this.locations.provinces();
  }

  @Get('provinces/:code/districts')
  districts(@Param('code') code: string) {
    return this.locations.districts(code);
  }

  @Get('districts/:code/communes')
  communes(@Param('code') code: string) {
    return this.locations.communes(code);
  }

  @Get('communes/:code/villages')
  villages(@Param('code') code: string) {
    return this.locations.villages(code);
  }
}
