import { loadEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://x',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.STORAGE_DRIVER).toBe('local');
  });

  it('fails fast on a short secret', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('requires S3 settings for the s3 driver', () => {
    expect(() => loadEnv({ ...base, STORAGE_DRIVER: 's3' })).toThrow(/S3_ENDPOINT/);
  });
});
