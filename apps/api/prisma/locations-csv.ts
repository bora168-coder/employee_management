import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';

/**
 * CSV format (UTF-8, header row required):
 *   level,code,parent_code,name_kh,name_en
 *   province,05,,ខេត្តកំពង់ស្ពឺ,Kampong Speu
 *   district,0508,05,ស្រុកថ្ពង,Thpong
 *   commune,050801,0508,ឃុំ…,…
 *   village,05080101,050801,ភូមិ…,…
 * Rows are upserted, so the import can be run again safely.
 */
export async function importLocationsCsv(
  prisma: PrismaClient,
  file: string,
): Promise<Record<string, number>> {
  const text = (await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const [header, ...rows] = lines;
  if (header.trim() !== 'level,code,parent_code,name_kh,name_en') {
    throw new Error(`Unexpected CSV header: ${header}`);
  }

  const order = ['province', 'district', 'commune', 'village'];
  const parsed = rows
    .map((line, i) => {
      const [level, code, parentCode, nameKh, nameEn] = line.split(',').map((s) => s.trim());
      if (!order.includes(level) || !code || !nameKh)
        throw new Error(`Bad CSV row ${i + 2}: ${line}`);
      return { level, code, parentCode, nameKh, nameEn: nameEn ?? '' };
    })
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));

  const counts: Record<string, number> = { province: 0, district: 0, commune: 0, village: 0 };
  for (const r of parsed) {
    const base = { nameKh: r.nameKh, nameEn: r.nameEn };
    switch (r.level) {
      case 'province':
        await prisma.province.upsert({
          where: { code: r.code },
          create: { code: r.code, ...base },
          update: base,
        });
        break;
      case 'district':
        await prisma.district.upsert({
          where: { code: r.code },
          create: { code: r.code, provinceCode: r.parentCode, ...base },
          update: { ...base, provinceCode: r.parentCode },
        });
        break;
      case 'commune':
        await prisma.commune.upsert({
          where: { code: r.code },
          create: { code: r.code, districtCode: r.parentCode, ...base },
          update: { ...base, districtCode: r.parentCode },
        });
        break;
      case 'village':
        await prisma.village.upsert({
          where: { code: r.code },
          create: { code: r.code, communeCode: r.parentCode, ...base },
          update: { ...base, communeCode: r.parentCode },
        });
        break;
    }
    counts[r.level]++;
  }
  return counts;
}
