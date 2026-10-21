import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { fetchCities } from './fetch-cities';

const SAO_PAULO = {
  id: 3550308,
  name: 'São Paulo',
  uf: 'SP',
  lat: -23.5329,
  lng: -46.6395,
};

describe('fetchCities', () => {
  it('chama o BFF /geo/cities da própria origem com o texto digitado', async () => {
    let received: URL | undefined;
    server.use(
      http.get(`${window.location.origin}/geo/cities`, ({ request }) => {
        received = new URL(request.url);
        return HttpResponse.json([SAO_PAULO]);
      }),
    );

    await expect(
      fetchCities('são', new AbortController().signal),
    ).resolves.toEqual([SAO_PAULO]);
    expect(received?.searchParams.get('q')).toBe('são');
  });

  it('rejeita quando o BFF responde erro', async () => {
    server.use(
      http.get(
        `${window.location.origin}/geo/cities`,
        () => new HttpResponse(null, { status: 503 }),
      ),
    );

    await expect(
      fetchCities('sao', new AbortController().signal),
    ).rejects.toThrow('GET /geo/cities: 503');
  });
});
