/**
 * Imports the official Cambodian gazetteer (provinces, districts, communes, villages).
 * Usage: npm run import:locations -w @csbms/api -- path/to/locations.csv
 */
import { PrismaClient } from '@prisma/client';
import { importLocationsCsv } from './locations-csv';

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: import:locations <file.csv>');
  const prisma = new PrismaClient();
  try {
    const counts = await importLocationsCsv(prisma, file);
    console.log('Imported:', counts);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
