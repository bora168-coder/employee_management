import * as os from 'os';
import * as path from 'path';
import { testDatabaseUrl } from './test-db-url';

// Test settings. TEST_DATABASE_URL must point to a database that can be wiped.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-123';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = path.join(os.tmpdir(), `csbms-test-storage-${process.pid}`);
