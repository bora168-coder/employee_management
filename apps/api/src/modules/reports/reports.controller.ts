import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, employeeListQuerySchema, Role } from '@csbms/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { ClientIp, CurrentUser, Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.reports.summary(user);
  }

  @Get('employees.xlsx')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.UNIT_HEAD)
  async exportExcel(
    @Query(new ZodValidationPipe(employeeListQuerySchema))
    query: z.output<typeof employeeListQuerySchema>,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.reports.exportExcel(query, user, ip);
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="employees_${date}.xlsx"`,
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(file);
  }
}
