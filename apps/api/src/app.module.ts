import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { OriginCheckMiddleware } from './common/origin-check.middleware';
import { RolesGuard } from './common/roles.guard';
import { ConfigModule } from './config/config.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { HealthModule } from './modules/health/health.module';
import { LocationsModule } from './modules/locations/locations.module';
import { OrganizationUnitsModule } from './modules/organization-units/organization-units.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { ReferenceDataModule } from './modules/reference-data/reference-data.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: isTest ? 'silent' : isProd ? 'info' : 'debug',
        transport:
          isProd || isTest ? undefined : { target: 'pino-pretty', options: { singleLine: true } },
        genReqId: (req, res) => {
          const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
          res.setHeader('X-Request-Id', id);
          return id;
        },
        // Log only what is needed; never cookies, tokens or request bodies.
        serializers: {
          req: (req: { id: string; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
        },
        customProps: (req) => ({ userId: (req as { user?: { id: string } }).user?.id }),
      },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: isTest ? 10_000 : 300 }]),
    PrismaModule,
    AuditModule,
    StorageModule,
    AuthModule,
    UsersModule,
    OrganizationUnitsModule,
    LocationsModule,
    ReferenceDataModule,
    EmployeesModule,
    AttachmentsModule,
    PdfModule,
    ReportsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OriginCheckMiddleware).forRoutes('*');
  }
}
