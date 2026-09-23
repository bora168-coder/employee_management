import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, organizationUnitSchema, Role } from '@csbms/shared';
import { z } from 'zod';
import { CurrentUser, Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { OrganizationUnitsService } from './organization-units.service';

type UnitBody = z.output<typeof organizationUnitSchema>;

@ApiTags('organization-units')
@Controller('organization-units')
export class OrganizationUnitsController {
  constructor(private readonly units: OrganizationUnitsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.units.list(user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(
    @Body(new ZodValidationPipe(organizationUnitSchema)) body: UnitBody,
    @CurrentUser() user: AuthUser,
  ) {
    return this.units.create(body, user);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(organizationUnitSchema)) body: UnitBody,
    @CurrentUser() user: AuthUser,
  ) {
    return this.units.update(id, body, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.units.remove(id, user);
  }
}
