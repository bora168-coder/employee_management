import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { AuthUser } from '@csbms/shared';
import { APP_ENV, AppEnv } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

@Injectable()
export class AuthService {
  /** Used to spend the same time when the username does not exist. */
  private dummyHash: Promise<string> = hashPassword('dummy-password-for-timing');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async login(
    username: string,
    password: string,
    ip: string | null,
  ): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
    const invalid = new UnauthorizedException({
      error: 'INVALID_CREDENTIALS',
      message: 'Wrong username or password',
    });

    if (!user || !user.isActive) {
      await argon2.verify(await this.dummyHash, password);
      throw invalid;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException(
        {
          error: 'ACCOUNT_LOCKED',
          message: `Too many failed logins. Try again after ${LOCK_MINUTES} minutes.`,
        },
        HttpStatus.LOCKED,
      );
    }

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        },
      });
      await this.audit.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        ip,
      });
      throw invalid;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ip,
    });

    return { user: toAuthUser(user), tokens: await this.issueTokens(user.id) };
  }

  /**
   * Rotates the refresh token. If a revoked token is used again, all sessions
   * of that user are revoked (the token was probably stolen).
   */
  async refresh(
    refreshToken: string | undefined,
  ): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const expired = new UnauthorizedException({
      error: 'TOKEN_EXPIRED',
      message: 'Session expired',
    });
    if (!refreshToken) throw expired;

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!stored) throw expired;

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw expired;
    }
    if (stored.expiresAt < new Date() || !stored.user.isActive) throw expired;

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return { user: toAuthUser(stored.user), tokens: await this.issueTokens(stored.userId) };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    user: AuthUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await argon2.verify(row.passwordHash, currentPassword))) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Current password is wrong',
      });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(newPassword) },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.log({
      userId: user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      after: { password: 'changed' },
    });
  }

  private async issueTokens(userId: string): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId });
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + this.env.JWT_REFRESH_TTL_DAYS * 86_400_000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: sha256(refreshToken), expiresAt: refreshExpiresAt },
    });
    return { accessToken, refreshToken, refreshExpiresAt };
  }
}

export function toAuthUser(u: {
  id: string;
  username: string;
  fullName: string;
  role: AuthUser['role'];
  organizationUnitId: string | null;
}): AuthUser {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    organizationUnitId: u.organizationUnitId,
  };
}
