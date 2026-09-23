import * as path from 'path';

/** Test database URL from the environment or apps/api/.env. It will be wiped. */
export function testDatabaseUrl(): string {
  if (!process.env.TEST_DATABASE_URL) {
    try {
      process.loadEnvFile(path.join(__dirname, '..', '.env'));
    } catch {
      // no .env file: the check below explains what to set
    }
  }
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Set TEST_DATABASE_URL in apps/api/.env');
  if (!/test/.test(url))
    throw new Error('TEST_DATABASE_URL must contain "test" (it will be wiped)');
  return url;
}
