import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { GET } from './route';

const CITIES_URL = `${TEST_API_URL}/api/v1/geo/cities`;

const city = (id: number, name: string) => ({
  id,
  name,
  uf: 'SP',
  lat: -23.55,
  lng: -46.63,
});

const FIVE = [
  city(3550308, 'São Paulo'),
  city(3548708, 'São Bernardo do Campo'),
  city(3548807, 'São Caetano do Sul'),
  city(3549904, 'São José dos Campos'),
  city(3550001, 'São José do Rio Preto'),
];

function request(q: string | null, headers?: HeadersInit) {
  const url = new URL('http://web.test/geo/cities');
  if (q !== null) url.searchParams.set('q', q);
  return new Request(url, { headers });
}

function apiAnswers(body: unknown, status = 200) {
  const calls: Request[] = [];
  server.use(
    http.get(CITIES_URL, ({ request }) => {
      calls.push(request);
      return HttpResponse.json(body as object, { status });
    }),
  );
  return calls;
}

describe('GET /geo/cities', () => {
  it.each([['sa'], ['  sa  '], [''], [null]])(
    'q=%j (menos de 3 caracteres) → 400 sem chamar a api (LOC-07)',
    async (q) => {
      const calls = apiAnswers(FIVE);

      const response = await GET(request(q));

      expect(response.status).toBe(400);
      expect(calls).toHaveLength(0);
    },
  );

  it('q="sao" → repassa à api e devolve até 5 municípios com cache de 1 dia', async () => {
    const calls = apiAnswers(FIVE);

    const response = await GET(
      request('sao', { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(FIVE);
    expect(response.headers.get('cache-control')).toBe(
      'public, s-maxage=86400',
    );
    expect(calls).toHaveLength(1);
    expect(new URL(calls[0]!.url).searchParams.get('q')).toBe('sao');
    expect(calls[0]!.headers.get('x-client-ip')).toBe('203.0.113.9');
  });

  it('erro da api → repassa o status, sem cache', async () => {
    apiAnswers({ message: 'q inválido' }, 400);

    const response = await GET(request('x'.repeat(101)));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
