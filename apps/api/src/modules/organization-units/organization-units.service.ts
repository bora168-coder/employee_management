import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, organizationUnitSchema, OrganizationUnitView, Role } from '@csbms/shared';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type UnitBody = z.output<typeof organizationUnitSchema>;

@Injectable()
export class OrganizationUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The unit and all units below it (recursive). */
  async descendantIds(unitId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE tree AS (
        SELECT id FROM organization_unit WHERE id = ${unitId}
        UNION ALL
        SELECT u.id FROM organization_unit u JOIN tree t ON u."parentId" = t.id
      )
      SELECT id FROM tree`;
    return rows.map((r) => r.id);
  }

  /**
   * Units the user may access. `null` means every unit (super admin).
   * A user without a unit sees nothing.
   */
  async scopeFor(user: AuthUser): Promise<string[] | null> {
    if (user.role === Role.SUPER_ADMIN) return null;
    if (!user.organizationUnitId) return [];
    return this.descendantIds(user.organizationUnitId);
  }

  async isInScope(user: AuthUser, unitId: string): Promise<boolean> {
    const scope = await this.scopeFor(user);
    return scope === null || scope.includes(unitId);
  }

  async list(user: AuthUser): Promise<OrganizationUnitView[]> {
    const scope = await this.scopeFor(user);
    return this.prisma.organizationUnit.findMany({
      where: scope === null ? {} : { id: { in: scope } },
      select: { id: true, nameKh: true, nameEn: true, parentId: true },
      orderBy: { nameKh: 'asc' },
    });
  }

  async create(input: UnitBody, user: AuthUser) {
    if (input.parentId) await this.getOrThrow(input.parentId);
    const unit = await this.prisma.organizationUnit.create({
      data: {
        nameKh: input.nameKh,
        nameEn: input.nameEn ?? null,
        parentId: input.parentId ?? null,
      },
    });
    await this.audit.log({
      userId: user.id,
      action: 'CREATE',
      entity: 'OrganizationUnit',
      entityId: unit.id,
      after: unit,
    });
    return unit;
  }

  async update(id: string, input: UnitBody, user: AuthUser) {
    const before = await this.getOrThrow(id);
    if (input.parentId) {
      await this.getOrThrow(input.parentId);
      const below = await this.descendantIds(id);
      if (below.includes(input.parentId)) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'A unit cannot be moved under itself',
          details: [{ field: 'parentId', message: 'A unit cannot be moved under itself' }],
        });
      }
    }
    const unit = await this.prisma.organizationUnit.update({
      where: { id },
      data: {
        nameKh: input.nameKh,
        nameEn: input.nameEn ?? null,
        parentId: input.parentId ?? null,
      },
    });
    await this.audit.log({
      userId: user.id,
      action: 'UPDATE',
      entity: 'OrganizationUnit',
      entityId: id,
      before,
      after: unit,
    });
    return unit;
  }

  async remove(id: string, user: AuthUser) {
    const before = await this.getOrThrow(id);
    await this.prisma.organizationUnit.delete({ where: { id } });
    await this.audit.log({
      userId: user.id,
      action: 'DELETE',
      entity: 'OrganizationUnit',
      entityId: id,
      before,
    });
  }

  private async getOrThrow(id: string) {
    const unit = await this.prisma.organizationUnit.findUnique({ where: { id } });
    if (!unit)
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Organization unit not found' });
    return unit;
  }
}
