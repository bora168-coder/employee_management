import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '@csbms/shared';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC } from './decorators';

export const ACCESS_COOKIE = 'csbms_at';
export const REFRESH_COOKIE = 'csbms_rt';
export const SESSION_HINT_COOKIE = 'csbms_session';

/**
 * Global guard: every route needs a valid access token unless marked @Public().
 * The token comes from the httpOnly cookie (browser) or a Bearer header (tools).
 * The user is re-loaded from the database so deactivation takes effect at once.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;
    const token =
      (req.cookies?.[ACCESS_COOKIE] as string | undefined) ??
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token)
      throw new UnauthorizedException({ error: 'UNAUTHENTICATED', message: 'Please log in' });

    let sub: string;
    try {
      sub = (await this.jwt.verifyAsync<{ sub: string }>(token)).sub;
    } catch {
      throw new UnauthorizedException({ error: 'TOKEN_EXPIRED', message: 'Session expired' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException({ error: 'UNAUTHENTICATED', message: 'Please log in' });
    }
    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      organizationUnitId: user.organizationUnitId,
    };
    return true;
  }
}
