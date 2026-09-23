import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  EmployeeSection,
  employeeListQuerySchema,
  personalSectionSchema,
  returnRecordSchema,
  Role,
  sectionSchemas,
  withVersion,
} from '@csbms/shared';
import { z } from 'zod';
import { ClientIp, CurrentUser, Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { EmployeesService, SectionData } from './employees.service';

const EDITORS = [Role.SUPER_ADMIN, Role.HR_ADMIN];
const VERIFIERS = [Role.SUPER_ADMIN, Role.UNIT_HEAD];

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(employeeListQuerySchema))
    query: z.output<typeof employeeListQuerySchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employees.list(query, user);
  }

  /** Creates a DRAFT record from the header + section ក. */
  @Post()
  @Roles(...EDITORS)
  create(
    @Body(new ZodValidationPipe(personalSectionSchema))
    body: z.output<typeof personalSectionSchema>,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.employees.create(body, user, ip);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.employees.get(id, user, { auditView: true, ip });
  }

  /** Saves one section: personal | education | work | awards | family. Body: { version, data }. */
  @Put(':id/sections/:section')
  @Roles(...EDITORS)
  updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('section') section: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    if (!(section in sectionSchemas)) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: `Unknown section "${section}"`,
      });
    }
    const schema = withVersion(sectionSchemas[section as EmployeeSection]);
    const parsed = new ZodValidationPipe(schema).transform(body) as {
      version: number;
      data: SectionData;
    };
    return this.employees.updateSection(
      id,
      section as EmployeeSection,
      parsed.version,
      parsed.data,
      user,
      ip,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...EDITORS)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.employees.remove(id, user, ip);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @Roles(...EDITORS)
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.employees.transition(id, 'submit', user, ip);
  }

  @Post(':id/verify')
  @HttpCode(200)
  @Roles(...VERIFIERS)
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.employees.transition(id, 'verify', user, ip);
  }

  @Post(':id/return')
  @HttpCode(200)
  @Roles(...VERIFIERS)
  returnRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(returnRecordSchema)) body: z.output<typeof returnRecordSchema>,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.employees.transition(id, 'return', user, ip, body.comment);
  }

  @Get(':id/history')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.UNIT_HEAD)
  history(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.employees.history(id, user);
  }
}
