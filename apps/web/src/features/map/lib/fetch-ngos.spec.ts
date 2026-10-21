import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/msw/server';
import { makeNgoPin } from '../test-fixtures';
import { fetchNgos } from './fetch-ngos';

const BFF_URL = `${window.location.origin}/map/ngos`;
const BODY = { items: [makeNgoPin()], truncated: false };

function bffAnswers(status = 200) {
  const received: URL[] = [];
  server.use(
    http.get(BFF_URL, ({ request }) => {
      received.push(new URL(request.url));
      return status === 200
        ? HttpResponse.json(BODY)
        : new HttpResponse(null, { status });
    }),
  );
  return received;
}

describe('fetchNgos', () => {
  it('chama o BFF da própria origem só com bbox e species (SEC-01)', async () => {
    const received = bffAnswers();

    await expect(
      fetchNgos(
        { bbox: [-46.7, -23.6, -46.59, -23.5], species: ['DOG', 'CAT'] },
        new AbortController().signal,
      ),
    ).resolves.toEqual(BODY);

    expect([...received[0]!.searchParams]).toEqual([
      ['bbox', '-46.7,-23.6,-46.59,-23.5'],
      ['species', 'DOG,CAT'],
    ]);
  });

  it('sem espécie, manda só a bbox', async () => {
    const received = bffAnswers();

    await fetchNgos(
      { bbox: [-46.7, -23.6, -46.59, -23.5], species: [] },
      new AbortController().signal,
    );

    expect([...received[0]!.searchParams.keys()]).toEqual(['bbox']);
  });

  it('rejeita quando o BFF responde erro', async () => {
    bffAnswers(503);

    await expect(
      fetchNgos(
        { bbox: [-46.7, -23.6, -46.59, -23.5], species: [] },
        new AbortController().signal,
      ),
    ).rejects.toThrow('GET /map/ngos: 503');
  });
});
