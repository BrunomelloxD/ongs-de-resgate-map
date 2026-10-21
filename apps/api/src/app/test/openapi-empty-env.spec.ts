import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OpenAPIObject } from '@nestjs/swagger';
import { envSchema, validateEnv } from '../../common/config/env.schema.js';

// Each build imports the whole module graph cold; under `make gate` load it passes 5 s.
const COLD_IMPORT_TIMEOUT_MS = 60_000;
const REQUIRED = [
  'DATABASE_URL',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'SMTP_URL',
  'MAIL_FROM',
  'WEB_URL',
  'INTERNAL_API_TOKEN',
  'IP_HASH_SECRET',
  'NOMINATIM_USER_AGENT',
];

/** A fresh AppModule, so ConfigModule validates the current env again. */
async function freshBuild(): Promise<OpenAPIObject> {
  vi.resetModules();
  const { buildOpenApiDocument } = await import('../openapi.js');
  return buildOpenApiDocument();
}

let emptyDir: string;

beforeAll(async () => {
  emptyDir = await mkdtemp(join(tmpdir(), 'openapi-empty-'));
});

afterAll(async () => {
  await rm(emptyDir, { recursive: true });
});

/** No variable set and no .env to read, like the Docker builder (T167). */
function emptyEnvironment() {
  for (const name of Object.keys(envSchema.shape)) vi.stubEnv(name, undefined);
  vi.spyOn(process, 'cwd').mockReturnValue(emptyDir);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('OpenAPI export sem variáveis de ambiente (T167, SEC-08)', () => {
  it(
    'gera o mesmo documento que com o ambiente da api',
    async () => {
      emptyEnvironment();
      const withoutEnv = await freshBuild();
      vi.unstubAllEnvs();
      vi.restoreAllMocks();

      const withEnv = await freshBuild();

      // Only the title follows APP_NAME, which has a default; the contract is the same.
      const { info: emptyInfo, ...contractWithoutEnv } = withoutEnv;
      const { info, ...contractWithEnv } = withEnv;
      expect(emptyInfo.title).toBe('api');
      expect(emptyInfo.version).toBe(info.version);
      expect(contractWithoutEnv.paths).toHaveProperty(['/api/v1/ngos']);
      expect(JSON.stringify(contractWithoutEnv)).toBe(
        JSON.stringify(contractWithEnv),
      );
    },
    COLD_IMPORT_TIMEOUT_MS * 2,
  );

  it(
    'não deixa os valores de marcação no ambiente: a api continua falhando ao subir sem eles (DEMO-21)',
    async () => {
      emptyEnvironment();

      await freshBuild();

      for (const name of REQUIRED) expect(process.env[name]).toBeUndefined();
      const startup = () => validateEnv({ ...process.env });
      expect(startup).toThrow('Variáveis de ambiente inválidas');
      for (const name of REQUIRED) expect(startup).toThrow(name);
    },
    COLD_IMPORT_TIMEOUT_MS,
  );

  it(
    'mantém os valores que já estão no ambiente',
    async () => {
      emptyEnvironment();
      vi.stubEnv('APP_NAME', 'minha-api');
      vi.stubEnv('S3_BUCKET', 'bucket-real');

      const document = await freshBuild();

      expect(document.info.title).toBe('minha-api');
      expect(process.env['S3_BUCKET']).toBe('bucket-real');
    },
    COLD_IMPORT_TIMEOUT_MS,
  );
});
