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

  describe('in production', () => {
    const prod = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://csbms:a-strong-password@db:5432/csbms',
      JWT_ACCESS_SECRET: 'y'.repeat(48),
    };

    it('accepts strong secrets', () => {
      expect(() => loadEnv(prod)).not.toThrow();
    });

    it('rejects example secrets', () => {
      expect(() =>
        loadEnv({
          ...prod,
          JWT_ACCESS_SECRET: 'change-me-access-secret-at-least-32-chars',
          DATABASE_URL: 'postgresql://csbms:csbms@localhost:5432/csbms',
          STORAGE_DRIVER: 's3',
          S3_ENDPOINT: 'http://minio:9000',
          S3_ACCESS_KEY: 'minioadmin',
          S3_SECRET_KEY: 'minioadmin',
        }),
      ).toThrow(/JWT_ACCESS_SECRET, DATABASE_URL password, S3_SECRET_KEY/);
    });

    it('allows the example secrets outside production', () => {
      expect(() =>
        loadEnv({ ...base, JWT_ACCESS_SECRET: 'change-me-access-secret-at-least-32-chars' }),
      ).not.toThrow();
    });
  });
});
