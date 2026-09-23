import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, createUserSchema, updateUserSchema, UserView } from '@csbms/shared';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashPassword } from '../auth/auth.service';

type CreateUserBody = z.output<typeof createUserSchema>;
type UpdateUserBody = z.output<typeof updateUserSchema>;

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  organizationUnit: { select: { id: true, nameKh: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<UserView[]> {
    const users = await this.prisma.user.findMany({
      select: userSelect,
      orderBy: { username: 'asc' },
    });
    return users.map(toView);
  }

  async create(input: CreateUserBody, actor: AuthUser): Promise<UserView> {
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName,
        role: input.role,
        organizationUnitId: input.organizationUnitId ?? null,
      },
      select: userSelect,
    });
    const view = toView(user);
    await this.audit.log({
      userId: actor.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      after: view,
    });
    return view;
  }

  async update(id: string, input: UpdateUserBody, actor: AuthUser): Promise<UserView> {
    const before = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!before) throw new NotFoundException({ error: 'NOT_FOUND', message: 'User not found' });

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: input.fullName,
        role: input.role,
        organizationUnitId: input.organizationUnitId,
        isActive: input.isActive,
        ...(input.password
          ? {
              passwordHash: await hashPassword(input.password),
              failedLoginCount: 0,
              lockedUntil: null,
            }
          : {}),
      },
      select: userSelect,
    });
    // Force re-login when the account is disabled or the password was reset.
    if (input.isActive === false || input.password) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    const view = toView(user);
    await this.audit.log({
      userId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      before: toView(before),
      after: { ...view, ...(input.password ? { password: 'reset' } : {}) },
    });
    return view;
  }
}

function toView(u: {
  id: string;
  username: string;
  fullName: string;
  role: UserView['role'];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  organizationUnit: { id: string; nameKh: string } | null;
}): UserView {
  return {
    ...u,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}
