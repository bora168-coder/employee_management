import { execSync } from 'child_process';
import * as path from 'path';
import { testDatabaseUrl } from './test-db-url';

/** Applies all migrations to the test database once before the tests. */
export default function globalSetup() {
  const url = testDatabaseUrl();
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
