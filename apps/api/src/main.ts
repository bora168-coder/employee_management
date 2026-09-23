import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { APP_ENV, AppEnv } from './config/env';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  setupApp(app);
  const env = app.get<AppEnv>(APP_ENV);
  await app.listen(env.PORT);
  app.get(Logger).log(`API listening on http://localhost:${env.PORT}/api/v1`);
}

void bootstrap();
