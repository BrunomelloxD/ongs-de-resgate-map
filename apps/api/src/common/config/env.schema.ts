import { z } from 'zod';

/** Integer variable; rejects empty, negative, fractional and non-numeric text. */
const integerEnv = (min: number) =>
  z
    .string()
    .regex(/^\d+$/, 'must be a non-negative integer')
    .transform(Number)
    .pipe(z.number().int().min(min));

const booleanEnv = z.enum(['true', 'false']).transform((v) => v === 'true');

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  APP_NAME: z.string().min(1).default('api'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  DATABASE_URL: z.url(),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(60),

  // Object storage (MinIO in dev, Railway Bucket in production).
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default('auto'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanEnv.default(false),

  // Mail (Mailpit in dev).
  SMTP_URL: z.url(),
  MAIL_FROM: z.string().min(1),

  // Public address of the web app, used in e-mail links.
  WEB_URL: z.url(),

  // Shared with the web (X-Internal-Token) and key for IP hashing.
  INTERNAL_API_TOKEN: z.string().min(32),
  IP_HASH_SECRET: z.string().min(32),

  // Geocoding; the public Nominatim requires an identifying User-Agent.
  NOMINATIM_URL: z.url().default('https://nominatim.openstreetmap.org'),
  NOMINATIM_USER_AGENT: z.string().min(1),

  // Demo mode and its quotas (defaults from the PRD, section 6.5).
  DEMO_MODE: booleanEnv.default(true),
  DEMO_RETENTION_DAYS: integerEnv(0).default(7),
  DEMO_MAX_NGOS: integerEnv(1).default(30),
  DEMO_SIGNUPS_PER_IP_PER_DAY: integerEnv(1).default(2),
  DEMO_MAX_ANIMALS_PER_NGO: integerEnv(1).default(10),
  DEMO_MAX_IMAGES_PER_ANIMAL: integerEnv(1).default(3),
  DEMO_MAX_UPLOAD_MB: integerEnv(1).default(5),
  DEMO_MAX_STORAGE_MB: integerEnv(1).default(500),
});

export type Env = z.infer<typeof envSchema>;

/** Fails fast on startup with a readable error. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente inválidas:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
