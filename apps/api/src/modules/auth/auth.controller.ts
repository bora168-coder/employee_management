import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, changePasswordSchema, loginSchema } from '@csbms/shared';
import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { APP_ENV, AppEnv } from '../../config/env';
import { ClientIp, CurrentUser, Public } from '../../common/decorators';
import { ACCESS_COOKIE, REFRESH_COOKIE, SESSION_HINT_COOKIE } from '../../common/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthService, IssuedTokens } from './auth.service';

const REFRESH_PATH = '/api/v1/auth';
/** Login attempts per IP per minute (the tests log in many times). */
const LOGIN_LIMIT = process.env.NODE_ENV === 'test' ? 10_000 : 10;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: LOGIN_LIMIT, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.output<typeof loginSchema>,
    @ClientIp() ip: string | null,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { user, tokens } = await this.auth.login(body.username, body.password, ip);
    this.setCookies(res, tokens);
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthUser> {
    try {
      const { user, tokens } = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
      this.setCookies(res, tokens);
      return user;
    } catch (e) {
      this.clearCookies(res);
      throw e;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookies(res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: z.output<typeof changePasswordSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.changePassword(user, body.currentPassword, body.newPassword);
    this.clearCookies(res);
  }

  private cookieBase(): CookieOptions {
    return { httpOnly: true, secure: this.env.COOKIE_SECURE, sameSite: 'lax' };
  }

  private setCookies(res: Response, tokens: IssuedTokens) {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.cookieBase(),
      path: '/',
      maxAge: this.env.JWT_ACCESS_TTL_SECONDS * 1000,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.cookieBase(),
      path: REFRESH_PATH,
      expires: tokens.refreshExpiresAt,
    });
    // Not a secret: only tells the web app's page guard that a session may exist.
    res.cookie(SESSION_HINT_COOKIE, '1', {
      ...this.cookieBase(),
      path: '/',
      expires: tokens.refreshExpiresAt,
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { ...this.cookieBase(), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...this.cookieBase(), path: REFRESH_PATH });
    res.clearCookie(SESSION_HINT_COOKIE, { ...this.cookieBase(), path: '/' });
  }
}
