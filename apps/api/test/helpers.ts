import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

export const PASSWORD = 'Password123!';
export const ORIGIN = 'http://localhost:3000';

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

/** Removes all rows (keeps the schema). */
export async function resetDb(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export interface Fixture {
  provinceUnitId: string;
  districtUnitId: string;
  otherUnitId: string;
  rankId: string;
}

/**
 * Units:  Province ─┬─ District
 *                   └─ (other) Other district
 * Users: admin (all), hr + head + viewer in District, hrOther in Other.
 */
export async function seedFixture(prisma: PrismaClient): Promise<Fixture> {
  await prisma.province.create({
    data: { code: '05', nameKh: 'ខេត្តកំពង់ស្ពឺ', nameEn: 'Kampong Speu' },
  });
  await prisma.district.create({
    data: { code: '0508', provinceCode: '05', nameKh: 'ស្រុកថ្ពង', nameEn: 'Thpong' },
  });
  const province = await prisma.organizationUnit.create({ data: { nameKh: 'ខេត្ត' } });
  const district = await prisma.organizationUnit.create({
    data: { nameKh: 'ស្រុក ក', parentId: province.id },
  });
  const other = await prisma.organizationUnit.create({
    data: { nameKh: 'ស្រុក ខ', parentId: province.id },
  });
  const rank = await prisma.rank.create({
    data: { framework: 'ខ.១.៤', titleKh: 'នាយកម្មការ', grade: 4 },
  });

  const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const users: [string, Role, string | null][] = [
    ['admin', Role.SUPER_ADMIN, null],
    ['hr', Role.HR_ADMIN, district.id],
    ['head', Role.UNIT_HEAD, district.id],
    ['viewer', Role.VIEWER, district.id],
    ['hrother', Role.HR_ADMIN, other.id],
  ];
  for (const [username, role, unit] of users) {
    await prisma.user.create({
      data: { username, role, fullName: username, passwordHash: hash, organizationUnitId: unit },
    });
  }
  return {
    provinceUnitId: province.id,
    districtUnitId: district.id,
    otherUnitId: other.id,
    rankId: rank.id,
  };
}

/** Logged-in agent: keeps cookies and sends the web origin like a browser. */
export async function login(app: INestApplication, username: string): Promise<TestAgent> {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ username, password: PASSWORD })
    .expect(200);
  return agent;
}

export function personal(unitId: string, overrides: Record<string, unknown> = {}) {
  return {
    organizationUnitId: unitId,
    nameKh: 'សុខ សុភា',
    nameLatin: 'Sok Sophea',
    gender: 'FEMALE',
    dateOfBirth: '1990-01-15',
    nationalIdNo: '012345678',
    phone1: '012 345 678',
    birthPlace: { provinceCode: '05', districtCode: '0508' },
    address: { provinceCode: '05' },
    ...overrides,
  };
}
