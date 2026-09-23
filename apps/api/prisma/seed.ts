/**
 * Seeds reference data and the first super admin.
 * Safe to run many times (upserts). Contains NO personal data.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as path from 'path';
import { importLocationsCsv } from './locations-csv';

const prisma = new PrismaClient();

async function main() {
  // 1. Locations: all provinces + sample districts/communes.
  //    Replace with the full official gazetteer: pnpm --filter @csbms/api import:locations <file.csv>
  const counts = await importLocationsCsv(
    prisma,
    path.join(__dirname, 'data', 'locations-sample.csv'),
  );
  console.log('Locations:', counts);

  // 2. Ranks (ក្របខ័ណ្ឌ). Add the rest from the Settings page.
  await prisma.rank.upsert({
    where: { framework_grade: { framework: 'ខ.១.៤', grade: 4 } },
    create: { framework: 'ខ.១.៤', titleKh: 'នាយកម្មការ', grade: 4 },
    update: {},
  });

  // 3. Common positions (មុខតំណែង).
  for (const nameKh of [
    'អភិបាលស្រុក',
    'អភិបាលរងស្រុក',
    'នាយករដ្ឋបាល',
    'នាយករងរដ្ឋបាល',
    'ប្រធានការិយាល័យ',
    'អនុប្រធានការិយាល័យ',
    'មន្ត្រី',
  ]) {
    await prisma.position.upsert({ where: { nameKh }, create: { nameKh }, update: {} });
  }

  // 4. Example organization tree (only when empty).
  if ((await prisma.organizationUnit.count()) === 0) {
    const province = await prisma.organizationUnit.create({
      data: { nameKh: 'ខេត្តកំពង់ស្ពឺ', nameEn: 'Kampong Speu Province' },
    });
    const district = await prisma.organizationUnit.create({
      data: {
        nameKh: 'រដ្ឋបាលស្រុកថ្ពង',
        nameEn: 'Thpong District Administration',
        parentId: province.id,
      },
    });
    await prisma.organizationUnit.create({
      data: {
        nameKh: 'ការិយាល័យរដ្ឋបាល និងហិរញ្ញវត្ថុ',
        nameEn: 'Administration and Finance Office',
        parentId: district.id,
      },
    });
  }

  // 5. First super admin.
  const username = (process.env.SEED_ADMIN_USERNAME ?? 'admin').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Set SEED_ADMIN_PASSWORD (at least 8 characters) before seeding');
  }
  const exists = await prisma.user.findUnique({ where: { username } });
  if (!exists) {
    await prisma.user.create({
      data: {
        username,
        fullName: 'System Administrator',
        role: Role.SUPER_ADMIN,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      },
    });
    console.log(`Created super admin "${username}". Change the password after the first login.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
