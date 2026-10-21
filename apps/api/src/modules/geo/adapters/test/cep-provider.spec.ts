import {
  CepNotFound,
  CepUnavailable,
  HttpCepProvider,
} from '../cep-provider.js';

const CEP = '01310100';
const BRASIL_API = `https://brasilapi.com.br/api/cep/v2/${CEP}`;
const VIA_CEP = `https://viacep.com.br/ws/${CEP}/json/`;

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

const brasilApiBody = {
  cep: CEP,
  state: 'SP',
  city: 'São Paulo',
  neighborhood: 'Bela Vista',
  street: 'Avenida Paulista',
  service: 'open-cep',
  location: {
    type: 'Point',
    coordinates: { longitude: '-46.6544', latitude: '-23.5614' },
  },
};

const viaCepBody = {
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  localidade: 'São Paulo',
  uf: 'SP',
};

type Route = (signal: AbortSignal) => Promise<Response>;

/** Fake fetch by URL; no real call ever leaves the test. */
function stubFetch(routes: { brasilApi: Route; viaCep: Route }) {
  const fetchMock = vi.fn((url: string, init: RequestInit) => {
    const signal = init.signal!;
    if (url === BRASIL_API) return routes.brasilApi(signal);
    if (url === VIA_CEP) return routes.viaCep(signal);
    throw new Error(`unexpected URL ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const down: Route = () => Promise.reject(new TypeError('fetch failed'));
const unexpected: Route = () => {
  throw new Error('should not be called');
};
/** Never answers; rejects when the signal aborts (at once if already aborted, like fetch). */
const hang: Route = (signal) =>
  new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    signal.addEventListener('abort', () => reject(signal.reason));
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('HttpCepProvider (LOC-09/10/11, SIGN-17/18)', () => {
  const provider = new HttpCepProvider();

  it('BrasilAPI ok: endereço com coordenada, sem chamar o ViaCEP', async () => {
    const fetchMock = stubFetch({
      brasilApi: () => json(brasilApiBody),
      viaCep: unexpected,
    });

    expect(await provider.lookup(CEP)).toEqual({
      street: 'Avenida Paulista',
      district: 'Bela Vista',
      city: 'São Paulo',
      uf: 'SP',
      lat: -23.5614,
      lng: -46.6544,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('BrasilAPI sem coordenada nem logradouro (CEP de município): campos vazios e sem lat/lng', async () => {
    stubFetch({
      brasilApi: () =>
        json({
          ...brasilApiBody,
          street: null,
          neighborhood: null,
          location: { type: 'Point', coordinates: {} },
        }),
      viaCep: unexpected,
    });

    expect(await provider.lookup(CEP)).toEqual({
      street: '',
      district: '',
      city: 'São Paulo',
      uf: 'SP',
    });
  });

  it('BrasilAPI fora e ViaCEP ok: endereço do ViaCEP, sem coordenada', async () => {
    stubFetch({ brasilApi: down, viaCep: () => json(viaCepBody) });

    expect(await provider.lookup(CEP)).toEqual({
      street: 'Avenida Paulista',
      district: 'Bela Vista',
      city: 'São Paulo',
      uf: 'SP',
    });
  });

  it('BrasilAPI com erro HTTP 500 e ViaCEP ok', async () => {
    stubFetch({
      brasilApi: () => json({ message: 'erro' }, 500),
      viaCep: () => json(viaCepBody),
    });

    expect((await provider.lookup(CEP)).city).toBe('São Paulo');
  });

  it('BrasilAPI com resposta fora do formato conta como fora do ar', async () => {
    stubFetch({
      brasilApi: () => json({ unexpected: true }),
      viaCep: () => json(viaCepBody),
    });

    expect((await provider.lookup(CEP)).street).toBe('Avenida Paulista');
  });

  it('os dois respondem "não existe" → CepNotFound (LOC-10)', async () => {
    stubFetch({
      brasilApi: () => json({ message: 'CEP não encontrado' }, 404),
      viaCep: () => json({ erro: true }),
    });

    await expect(provider.lookup(CEP)).rejects.toThrow(CepNotFound);
  });

  it('ViaCEP com erro "true" em texto também é "não existe"', async () => {
    stubFetch({
      brasilApi: () => json({}, 404),
      viaCep: () => json({ erro: 'true' }),
    });

    await expect(provider.lookup(CEP)).rejects.toThrow(CepNotFound);
  });

  it('um diz "não existe" e o outro está fora → CepNotFound', async () => {
    stubFetch({ brasilApi: () => json({}, 404), viaCep: down });

    await expect(provider.lookup(CEP)).rejects.toThrow(CepNotFound);
  });

  it('BrasilAPI fora e ViaCEP fora do formato → CepUnavailable', async () => {
    stubFetch({ brasilApi: down, viaCep: () => json(null) });

    await expect(provider.lookup(CEP)).rejects.toThrow(CepUnavailable);
  });

  it('os dois fora → CepUnavailable (LOC-11)', async () => {
    stubFetch({
      brasilApi: down,
      viaCep: () => json({ message: 'erro' }, 502),
    });

    await expect(provider.lookup(CEP)).rejects.toThrow(CepUnavailable);
  });

  it('mais de 5 s no total → CepUnavailable (LOC-11, SIGN-18)', async () => {
    vi.useFakeTimers();
    stubFetch({ brasilApi: hang, viaCep: hang });

    const result = provider.lookup(CEP);
    const assertion = expect(result).rejects.toThrow(CepUnavailable);
    await vi.advanceTimersByTimeAsync(4_999);
    let settled = false;
    void result.catch(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });

  it('o prazo de 5 s é total: BrasilAPI lento consome o tempo do ViaCEP', async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch({
      brasilApi: (signal) =>
        new Promise((resolve, reject) => {
          setTimeout(() => resolve(json({}, 500)), 4_000);
          signal.addEventListener('abort', () => reject(signal.reason));
        }),
      viaCep: hang,
    });

    const assertion = expect(provider.lookup(CEP)).rejects.toThrow(
      CepUnavailable,
    );
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
