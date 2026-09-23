import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuditAction } from '@csbms/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  userId: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

type Tx = Prisma.TransactionClient;

/** Writes business/security audit records (who did what, to which record, when). */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Pass `tx` to write the audit record in the same transaction as the change. */
  async log(entry: AuditEntry, tx?: Tx): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: toJson(entry.before),
        after: toJson(entry.after),
        ip: entry.ip ?? null,
      },
    });
    this.logger.log({ event: 'audit', ...entry, before: undefined, after: undefined });
  }

  async listFor(entity: string, entityId: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { user: { select: { id: true, fullName: true } } },
    });
    return rows.map((r) => ({
      id: r.id.toString(),
      action: r.action,
      entity: r.entity,
      user: r.user,
      before: r.before,
      after: r.after,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
