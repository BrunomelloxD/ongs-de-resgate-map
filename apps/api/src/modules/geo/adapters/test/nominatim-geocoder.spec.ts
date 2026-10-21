import type { AppConfigService } from '@/common/config/app-config.service.js';
import { NominatimGeocoder } from '../nominatim-geocoder.js';

const CONFIG = {
  nominatim: {
    url: 'https://nominatim.example',
    userAgent: 'animal-helper-test/1.0 (contato@example.com)',
  },
} as AppConfigService;

const PAULISTA = 'Avenida Paulista, 1000, Bela Vista, São Paulo, SP';
const XV = 'Rua XV de Novembro, 10, Centro, Curitiba, PR';

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));
const found = (lat: string, lon: string) => json([{ lat, lon }]);

function stubFetch(
  impl: (url: string, init: RequestInit) => Promise<Response>,
) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('NominatimGeocoder (SIGN-19, SIGN-20)', () => {
  it('geocodifica com User-Agent de NOMINATIM_USER_AGENT e devolve lat/lng numéricos', async () => {
    const fetchMock = stubFetch(() => found('-23.5631', '-46.6544'));
    const geocoder = new NominatimGeocoder(CONFIG);

    expect(await geocoder.geocode(PAULISTA)).toEqual({
      lat: -23.5631,
      lng: -46.6544,
    });

    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      'https://nominatim.example/search',
    );
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      q: PAULISTA,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'br',
    });
    expect(init.headers).toMatchObject({
      'User-Agent': 'animal-helper-test/1.0 (contato@example.com)',
    });
  });

  it('duas chamadas seguidas respeitam 1 s de intervalo', async () => {
    const fetchMock = stubFetch((url) =>
      url.includes('Curitiba')
        ? found('-25.4296', '-49.2713')
        : found('-23.5631', '-46.6544'),
    );
    const geocoder = new NominatimGeocoder(CONFIG);

    const first = geocoder.geocode(PAULISTA);
    const second = geocoder.geocode(XV);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await first).toEqual({ lat: -23.5631, lng: -46.6544 });
    expect(await second).toEqual({ lat: -25.4296, lng: -49.2713 });
  });

  it('uma chamada depois de mais de 1 s sai sem espera', async () => {
    const fetchMock = stubFetch(() => found('-23.5631', '-46.6544'));
    const geocoder = new NominatimGeocoder(CONFIG);

    await geocoder.geocode(PAULISTA);
    await vi.advanceTimersByTimeAsync(1_500);
    void geocoder.geocode(XV);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a segunda consulta igual sai do cache, sem nova requisição', async () => {
    const fetchMock = stubFetch(() => found('-23.5631', '-46.6544'));
    const geocoder = new NominatimGeocoder(CONFIG);

    await geocoder.geocode(PAULISTA);
    const cached = await geocoder.geocode(`  ${PAULISTA.toUpperCase()} `);

    expect(cached).toEqual({ lat: -23.5631, lng: -46.6544 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('o cache descarta o endereço usado há mais tempo ao passar de 500', async () => {
    const fetchMock = stubFetch(() => found('-23.5631', '-46.6544'));
    const geocoder = new NominatimGeocoder(CONFIG);
    const run = async (address: string) => {
      const pending = geocoder.geocode(address);
      await vi.advanceTimersByTimeAsync(1_000);
      return pending;
    };

    await run('endereço 0');
    for (let i = 1; i < 500; i++) await run(`endereço ${i}`);
    await run('endereço 0'); // touch: now the most recent
    await run('endereço 500'); // evicts "endereço 1"
    expect(fetchMock).toHaveBeenCalledTimes(501);

    await run('endereço 0');
    expect(fetchMock).toHaveBeenCalledTimes(501);
    await run('endereço 1');
    expect(fetchMock).toHaveBeenCalledTimes(502);
  });

  it('resposta vazia → null, e também fica no cache', async () => {
    const fetchMock = stubFetch(() => json([]));
    const geocoder = new NominatimGeocoder(CONFIG);

    expect(await geocoder.geocode(PAULISTA)).toBeNull();
    expect(await geocoder.geocode(PAULISTA)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('erro HTTP → null, sem guardar no cache', async () => {
    const fetchMock = stubFetch(() => json({ error: 'rate limited' }, 429));
    const geocoder = new NominatimGeocoder(CONFIG);

    expect(await geocoder.geocode(PAULISTA)).toBeNull();
    const retry = geocoder.geocode(PAULISTA);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await retry).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falha de rede → null', async () => {
    stubFetch(() => Promise.reject(new TypeError('fetch failed')));
    const geocoder = new NominatimGeocoder(CONFIG);

    expect(await geocoder.geocode(PAULISTA)).toBeNull();
  });

  it('resposta fora do formato → null', async () => {
    stubFetch(() => json([{ lat: 'abc', lon: '-46.6' }]));
    const geocoder = new NominatimGeocoder(CONFIG);

    expect(await geocoder.geocode(PAULISTA)).toBeNull();
  });

  it('requisição sem resposta em 5 s → null, e a fila segue', async () => {
    const fetchMock = stubFetch(
      (_url, init) =>
        new Promise((_, reject) => {
          init.signal!.addEventListener('abort', () =>
            reject(init.signal!.reason),
          );
        }),
    );
    const geocoder = new NominatimGeocoder(CONFIG);

    const pending = geocoder.geocode(PAULISTA);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await pending).toBeNull();

    fetchMock.mockImplementation(() => found('-25.4296', '-49.2713'));
    expect(await geocoder.geocode(XV)).toEqual({
      lat: -25.4296,
      lng: -49.2713,
    });
  });
});
