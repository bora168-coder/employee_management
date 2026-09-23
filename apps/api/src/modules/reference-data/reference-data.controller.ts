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
import { AuthUser, positionSchema, rankSchema, Role } from '@csbms/shared';
import { z } from 'zod';
import { CurrentUser, Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type PositionBody = z.output<typeof positionSchema>;
type RankBody = z.output<typeof rankSchema>;

/** Positions (មុខតំណែង) and ranks (ក្របខ័ណ្ឌ / ឋានន្តរស័ក្តិ / ថ្នាក់). */
@ApiTags('reference-data')
@Controller()
export class ReferenceDataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('positions')
  positions() {
    return this.prisma.position.findMany({ orderBy: { nameKh: 'asc' } });
  }

  @Post('positions')
  @Roles(Role.SUPER_ADMIN)
  async createPosition(
    @Body(new ZodValidationPipe(positionSchema)) body: PositionBody,
    @CurrentUser() user: AuthUser,
  ) {
    const row = await this.prisma.position.create({
      data: { nameKh: body.nameKh, nameEn: body.nameEn ?? null },
    });
    await this.audit.log({
      userId: user.id,
      action: 'CREATE',
      entity: 'Position',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  @Put('positions/:id')
  @Roles(Role.SUPER_ADMIN)
  async updatePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(positionSchema)) body: PositionBody,
    @CurrentUser() user: AuthUser,
  ) {
    const row = await this.prisma.position.update({
      where: { id },
      data: { nameKh: body.nameKh, nameEn: body.nameEn ?? null },
    });
    await this.audit.log({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Position',
      entityId: id,
      after: row,
    });
    return row;
  }

  @Delete('positions/:id')
  @HttpCode(204)
  @Roles(Role.SUPER_ADMIN)
  async deletePosition(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const row = await this.prisma.position.delete({ where: { id } });
    await this.audit.log({
      userId: user.id,
      action: 'DELETE',
      entity: 'Position',
      entityId: id,
      before: row,
    });
  }

  @Get('ranks')
  ranks() {
    return this.prisma.rank.findMany({ orderBy: [{ framework: 'asc' }, { grade: 'asc' }] });
  }

  @Post('ranks')
  @Roles(Role.SUPER_ADMIN)
  async createRank(
    @Body(new ZodValidationPipe(rankSchema)) body: RankBody,
    @CurrentUser() user: AuthUser,
  ) {
    const row = await this.prisma.rank.create({ data: body });
    await this.audit.log({
      userId: user.id,
      action: 'CREATE',
      entity: 'Rank',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  @Put('ranks/:id')
  @Roles(Role.SUPER_ADMIN)
  async updateRank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(rankSchema)) body: RankBody,
    @CurrentUser() user: AuthUser,
  ) {
    const row = await this.prisma.rank.update({ where: { id }, data: body });
    await this.audit.log({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Rank',
      entityId: id,
      after: row,
    });
    return row;
  }

  @Delete('ranks/:id')
  @HttpCode(204)
  @Roles(Role.SUPER_ADMIN)
  async deleteRank(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const row = await this.prisma.rank.delete({ where: { id } });
    await this.audit.log({
      userId: user.id,
      action: 'DELETE',
      entity: 'Rank',
      entityId: id,
      before: row,
    });
  }
}
