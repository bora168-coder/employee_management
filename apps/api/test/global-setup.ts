import { execSync } from 'child_process';
import * as path from 'path';

/** Applies all migrations to the test database once before the tests. */
export default function globalSetup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    'postgresql://csbms:csbms@localhost:5432/csbms_test?schema=public';
  if (!/test/.test(url))
    throw new Error('TEST_DATABASE_URL must contain "test" (it will be wiped)');
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
