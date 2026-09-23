import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { APP_ENV, AppEnv } from './config/env';

export const API_PREFIX = 'api/v1';

/** Shared by main.ts and the e2e tests so both run the same setup. */
export function setupApp(app: INestApplication): void {
  const env = app.get<AppEnv>(APP_ENV);
  const express = app as NestExpressApplication;

  // Behind Nginx / the Next.js proxy: trust the first proxy for the client IP.
  express.set('trust proxy', 1);
  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CSBMS API')
      .setDescription('Civil Servant Biography Management System')
      .setVersion('1.0')
      .addCookieAuth('csbms_at')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
}
