import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type Check = 'up' | 'down';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** 200 when the database and file storage work, 503 otherwise. */
  @Public()
  @Get()
  async health(@Res({ passthrough: true }) res: Response) {
    const [database, storage] = await Promise.all([
      this.run(() => this.prisma.$queryRaw`SELECT 1`),
      this.run(() => this.storage.check()),
    ]);
    const status = database === 'up' && storage === 'up' ? 'ok' : 'error';
    res.status(status === 'ok' ? 200 : 503);
    return { status, checks: { database, storage }, uptimeSeconds: Math.round(process.uptime()) };
  }

  private async run(fn: () => Promise<unknown>): Promise<Check> {
    try {
      await fn();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
