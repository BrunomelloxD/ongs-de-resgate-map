import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { GET } from './route';

const NGO_ID = '6f1c2b52-0c55-4d43-9d3b-1f0b7a1d2c01';
const IMAGE_ID = '0b9f3a3e-5d7c-4c1b-8a2e-3f4d5e6a7b8c';
const ANIMAL_KEY = `ngos/${NGO_ID}/images/${IMAGE_ID}-1200.webp`;
const LOGO_KEY = `ngos/${NGO_ID}/logo/${IMAGE_ID}-160.webp`;
const BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4]);

function call(key: string) {
  return GET(new Request(`http://web.test/img/${key}`), {
    params: Promise.resolve({ key: key.split('/') }),
  });
}

function apiAnswers(status = 200) {
  const calls: Request[] = [];
  server.use(
    http.get(`${TEST_API_URL}/api/v1/media/*`, ({ request }) => {
      calls.push(request);
      return status === 200
        ? new HttpResponse(BYTES, {
            headers: { 'Content-Type': 'image/webp' },
          })
        : new HttpResponse(null, { status });
    }),
  );
  return calls;
}

describe('GET /img/[...key]', () => {
  it.each([
    ['foto do animal', ANIMAL_KEY],
    ['imagem da ONG', LOGO_KEY],
  ])(
    '%s → 200 com o corpo da api, image/webp e cache imutável (PERF-02)',
    async (_, key) => {
      const calls = apiAnswers();

      const response = await call(key);

      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(BYTES);
      expect(response.headers.get('content-type')).toBe('image/webp');
      expect(response.headers.get('cache-control')).toBe(
        'public, max-age=86400, immutable',
      );
      expect(calls).toHaveLength(1);
      expect(new URL(calls[0]!.url).pathname).toBe(`/api/v1/media/${key}`);
    },
  );

  it.each([
    ['com ..', `ngos/${NGO_ID}/images/../${IMAGE_ID}-1200.webp`],
    ['com extensão diferente', `ngos/${NGO_ID}/images/${IMAGE_ID}-1200.png`],
    ['sem o tamanho', `ngos/${NGO_ID}/images/${IMAGE_ID}.webp`],
    ['pasta fora de images/logo', `ngos/${NGO_ID}/other/${IMAGE_ID}-160.webp`],
    ['id que não é uuid', `ngos/${NGO_ID}/images/abc-160.webp`],
    [
      'uuid em maiúsculas',
      `ngos/${NGO_ID.toUpperCase()}/logo/${IMAGE_ID}-160.webp`,
    ],
    [
      'prefixo diferente de ngos/',
      `x/ngos/${NGO_ID}/images/${IMAGE_ID}-160.webp`,
    ],
  ])('chave %s → 404 sem chamar a api', async (_, key) => {
    const calls = apiAnswers();

    const response = await call(key);

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(calls).toHaveLength(0);
  });

  it('404 da api → 404, sem o cache imutável', async () => {
    apiAnswers(404);

    const response = await call(ANIMAL_KEY);

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('500 da api → 502, sem o cache imutável', async () => {
    apiAnswers(500);

    const response = await call(ANIMAL_KEY);

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
