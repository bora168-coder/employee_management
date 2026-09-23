import { ForbiddenException, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { APP_ENV, AppEnv } from '../config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for cookie auth (together with SameSite=Lax cookies):
 * a state-changing request from a browser must come from the web app's origin.
 */
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.headers.origin;
    if (origin && origin !== this.env.WEB_ORIGIN) {
      throw new ForbiddenException({ error: 'BAD_ORIGIN', message: 'Request origin not allowed' });
    }
    next();
  }
}
