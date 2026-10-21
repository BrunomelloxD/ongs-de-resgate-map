import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { geocodeAddress } from './geocode-address';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.8' }),
}));

const GEOCODE_URL = `${TEST_API_URL}/api/v1/geo/geocode`;
const CITIES_URL = `${TEST_API_URL}/api/v1/geo/cities`;

const ADDRESS = {
  street: 'Rua Vergueiro',
  number: '3000',
  district: 'Vila Mariana',
  city: 'São Paulo',
  uf: 'SP',
};

const CITIES = [
  { id: 3550308, name: 'São Paulo', uf: 'SP', lat: -23.5329, lng: -46.6395 },
  {
    id: 2513703,
    name: 'São Paulo do Potengi',
    uf: 'RN',
    lat: -5.89,
    lng: -35.76,
  },
];

function apiAnswers(geocode: () => Response, cities: unknown[] = CITIES) {
  const calls = {
    geocode: [] as { body: unknown; ip: string | null }[],
    cities: [] as string[],
  };
  server.use(
    http.post(GEOCODE_URL, async ({ request }) => {
      calls.geocode.push({
        body: await request.json(),
        ip: request.headers.get('x-client-ip'),
      });
      return geocode();
    }),
    http.get(CITIES_URL, ({ request }) => {
      calls.cities.push(new URL(request.url).searchParams.get('q') ?? '');
      return HttpResponse.json(cities);
    }),
  );
  return calls;
}

const notFound = () =>
  HttpResponse.json({ found: false, lat: null, lng: null });

describe('geocodeAddress', () => {
  it('SIGN-19: endereço achado devolve a coordenada com found: true', async () => {
    const calls = apiAnswers(() =>
      HttpResponse.json({ found: true, lat: -23.5869, lng: -46.6347 }),
    );

    await expect(geocodeAddress(ADDRESS)).resolves.toEqual({
      found: true,
      lat: -23.5869,
      lng: -46.6347,
    });
    expect(calls.geocode).toEqual([
      {
        body: {
          address: 'Rua Vergueiro, 3000, Vila Mariana, São Paulo - SP',
        },
        ip: '198.51.100.8',
      },
    ]);
    expect(calls.cities).toHaveLength(0);
  });

  it('SIGN-20: endereço não achado devolve o centro da cidade com found: false', async () => {
    const calls = apiAnswers(notFound);

    await expect(geocodeAddress(ADDRESS)).resolves.toEqual({
      found: false,
      lat: -23.5329,
      lng: -46.6395,
    });
    expect(calls.cities).toEqual(['São Paulo']);
  });

  it('SIGN-20: a cidade é achada sem acento e sem caixa, na UF do endereço', async () => {
    apiAnswers(notFound, [
      { id: 1, name: 'São Paulo', uf: 'RN', lat: 1, lng: 1 },
      { id: 2, name: 'São Paulo', uf: 'SP', lat: 2, lng: 2 },
    ]);

    await expect(
      geocodeAddress({ ...ADDRESS, city: 'sao paulo' }),
    ).resolves.toEqual({ found: false, lat: 2, lng: 2 });
  });

  it('SIGN-20: com a geocodificação fora do ar, também usa o centro da cidade', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 503 }));

    await expect(geocodeAddress(ADDRESS)).resolves.toEqual({
      found: false,
      lat: -23.5329,
      lng: -46.6395,
    });
  });

  it('sem endereço nem cidade achados, devolve found: false sem coordenada', async () => {
    apiAnswers(notFound, []);

    await expect(geocodeAddress(ADDRESS)).resolves.toEqual({
      found: false,
      lat: null,
      lng: null,
    });
  });

  it('com a busca de cidades fora do ar, devolve found: false sem coordenada', async () => {
    apiAnswers(notFound);
    server.use(
      http.get(CITIES_URL, () => new HttpResponse(null, { status: 503 })),
    );

    await expect(geocodeAddress(ADDRESS)).resolves.toEqual({
      found: false,
      lat: null,
      lng: null,
    });
  });

  it('endereço incompleto não chama a api', async () => {
    const calls = apiAnswers(notFound);

    await expect(geocodeAddress({ ...ADDRESS, city: '' })).resolves.toEqual({
      found: false,
      lat: null,
      lng: null,
    });
    expect(calls.geocode).toHaveLength(0);
    expect(calls.cities).toHaveLength(0);
  });
});
