import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOpenApiDocument, exportOpenApi } from '../openapi.js';

// The first build imports the whole module graph cold; under `make gate` load it passes 5 s.
const COLD_IMPORT_TIMEOUT_MS = 30_000;

describe('OpenAPI export', () => {
  it(
    'gera o documento com as rotas versionadas sem conectar no banco',
    async () => {
      const document = await buildOpenApiDocument();

      expect(Object.keys(document.paths)).toEqual(
        expect.arrayContaining(['/health']),
      );
    },
    COLD_IMPORT_TIMEOUT_MS,
  );

  describe('título do documento', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('usa o APP_NAME quando definido', async () => {
      vi.stubEnv('APP_NAME', 'minha-api');

      expect((await buildOpenApiDocument()).info.title).toBe('minha-api');
    });

    it("usa 'api' quando o APP_NAME não está definido", async () => {
      vi.stubEnv('APP_NAME', undefined);

      expect((await buildOpenApiDocument()).info.title).toBe('api');
    });
  });

  it('grava o documento em JSON no caminho informado', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'openapi-'));
    const output = join(dir, 'openapi.json');

    await exportOpenApi(output);

    const written = JSON.parse(await readFile(output, 'utf8'));
    expect(written.openapi).toMatch(/^3\./);
    expect(written.paths).toHaveProperty('/health');
    await rm(dir, { recursive: true });
  });
});
