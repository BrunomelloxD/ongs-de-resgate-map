import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { GET } from './route';

const NGOS_URL = `${TEST_API_URL}/api/v1/ngos`;

const BODY = {
  items: [
    {
      id: '6f1c2b52-0c55-4d43-9d3b-1f0b7a1d2c01',
      slug: 'patas-do-bairro',
      name: 'Patas do Bairro',
      lat: -23.5869,
      lng: -46.6347,
      openNow: true,
      todayHours: { closed: false, opensAt: '09:00', closesAt: '18:00' },
      thumbUrl: null,
    },
  ],
  truncated: false,
};

function request(query: string, headers?: HeadersInit) {
  return new Request(`http://web.test/map/ngos${query}`, { headers });
}

function apiAnswers(body: unknown, status = 200) {
  const calls: Request[] = [];
  server.use(
    http.get(NGOS_URL, ({ request }) => {
      calls.push(request);
      return HttpResponse.json(body as object, { status });
    }),
  );
  return calls;
}

describe('GET /map/ngos', () => {
  it.each([
    ['bbox com 3 casas', '?bbox=-46.701,-23.6,-46.6,-23.5'],
    ['bbox com 3 números', '?bbox=-46.7,-23.6,-46.6'],
    ['bbox que não é número', '?bbox=a,b,c,d'],
    ['sem bbox', ''],
    ['species fora de DOG/CAT', '?bbox=-46.7,-23.6,-46.6,-23.5&species=OTHER'],
  ])('%s → 400 sem chamar a api (SEC-01)', async (_, query) => {
    const calls = apiAnswers(BODY);

    const response = await GET(request(query));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(calls).toHaveLength(0);
  });

  it('bbox válida → repassa bbox e species e devolve com s-maxage=60 (PERF-03)', async () => {
    const calls = apiAnswers(BODY);

    const response = await GET(
      request('?bbox=-46.7,-23.6,-46.6,-23.5&species=DOG,CAT', {
        'x-forwarded-for': '203.0.113.9, 10.0.0.1',
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(BODY);
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=60');
    expect(calls).toHaveLength(1);
    const forwarded = new URL(calls[0]!.url).searchParams;
    expect(forwarded.get('bbox')).toBe('-46.7,-23.6,-46.6,-23.5');
    expect(forwarded.get('species')).toBe('DOG,CAT');
    expect([...forwarded.keys()]).toEqual(['bbox', 'species']);
    expect(calls[0]!.headers.get('x-client-ip')).toBe('203.0.113.9');
  });

  it('sem species → repassa só a bbox', async () => {
    const calls = apiAnswers(BODY);

    await GET(request('?bbox=-46,-24,-45,-23'));

    expect([...new URL(calls[0]!.url).searchParams.keys()]).toEqual(['bbox']);
  });

  it('erro da api → repassa o status, sem cache', async () => {
    apiAnswers({ message: 'bbox inválida' }, 400);

    const response = await GET(request('?bbox=-46.6,-23.5,-46.7,-23.6'));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('nenhum console recebe a query string (SEC-02)', async () => {
    apiAnswers(BODY);
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );

    await GET(request('?bbox=-46.7,-23.6,-46.6,-23.5&species=DOG'));
    await GET(request('?bbox=-46.701,-23.6,-46.6,-23.5'));

    for (const spy of spies) {
      const printed = JSON.stringify(spy.mock.calls);
      expect(printed).not.toContain('-46.7');
      expect(printed).not.toContain('bbox');
      spy.mockRestore();
    }
  });
});
