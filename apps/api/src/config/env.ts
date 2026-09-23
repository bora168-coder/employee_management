import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default('csbms'),
  CHROMIUM_EXECUTABLE_PATH: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

/** Validates environment variables once at startup. Fails fast with a clear message. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  if (result.data.STORAGE_DRIVER === 's3') {
    for (const key of ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const) {
      if (!result.data[key]) throw new Error(`${key} is required when STORAGE_DRIVER=s3`);
    }
  }
  if (result.data.NODE_ENV === 'production') {
    const weak = exampleSecretsIn(result.data);
    if (weak.length)
      throw new Error(`Example secrets are not allowed in production: ${weak.join(', ')}`);
  }
  return result.data;
}

/** Values copied from .env.example or docker-compose defaults. */
const EXAMPLE_SECRETS = ['change-me-access-secret-at-least-32-chars', 'minioadmin', 'csbms'];

function exampleSecretsIn(env: AppEnv): string[] {
  const weak: string[] = [];
  if (EXAMPLE_SECRETS.includes(env.JWT_ACCESS_SECRET)) weak.push('JWT_ACCESS_SECRET');
  const dbPassword = safeUrlPassword(env.DATABASE_URL);
  if (dbPassword !== null && (dbPassword === '' || EXAMPLE_SECRETS.includes(dbPassword)))
    weak.push('DATABASE_URL password');
  if (env.STORAGE_DRIVER === 's3' && EXAMPLE_SECRETS.includes(env.S3_SECRET_KEY ?? ''))
    weak.push('S3_SECRET_KEY');
  return weak;
}

function safeUrlPassword(url: string): string | null {
  try {
    return decodeURIComponent(new URL(url).password);
  } catch {
    return null;
  }
}

export const APP_ENV = Symbol('APP_ENV');
