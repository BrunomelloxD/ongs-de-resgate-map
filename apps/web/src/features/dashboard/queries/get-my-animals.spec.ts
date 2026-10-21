import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { makeMyAnimal, makeMyNgo } from '../test-fixtures';
import { getMyAnimals, getMyNgo } from './get-my-animals';

const store = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.40' }),
}));

const NGO_URL = `${TEST_API_URL}/api/v1/me/ngo`;
const ANIMALS_URL = `${TEST_API_URL}/api/v1/me/animals`;

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

function answer(url: string, body: unknown, status = 200) {
  const calls: Request[] = [];
  server.use(
    http.get(url, ({ request }) => {
      calls.push(request);
      return HttpResponse.json(body as object, { status });
    }),
  );
  return calls;
}

beforeEach(() => {
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('getMyNgo', () => {
  it('DASH-07/DEMO-06: 200 → a ONG da sessão, pedida com o Bearer', async () => {
    const ngo = makeMyNgo({ imageUrl: null });
    const calls = answer(NGO_URL, ngo);

    await expect(getMyNgo()).resolves.toEqual(ngo);
    expect(calls[0]!.headers.get('authorization')).toBe('Bearer token-abc');
  });

  it('AUTH-07: 401 (sessão vencida ou ONG apagada pela limpeza) → /session/end', async () => {
    answer(NGO_URL, { message: 'Unauthorized' }, 401);

    const error = await getMyNgo().catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });

  it('500 → lança (cai no error.tsx)', async () => {
    answer(NGO_URL, { message: 'erro' }, 500);

    await expect(getMyNgo()).rejects.toThrow('GET /me/ngo failed: 500');
  });
});

describe('getMyAnimals', () => {
  it('DASH-01: 200 → todos os animais, sem busca nem filtro na query', async () => {
    const animals = [makeMyAnimal(), makeMyAnimal({ name: 'Nina' })];
    const calls = answer(ANIMALS_URL, animals);

    await expect(getMyAnimals()).resolves.toEqual(animals);
    expect(new URL(calls[0]!.url).search).toBe('');
    expect(calls[0]!.headers.get('authorization')).toBe('Bearer token-abc');
  });

  it('AUTH-07: 401 → /session/end', async () => {
    answer(ANIMALS_URL, { message: 'Unauthorized' }, 401);

    const error = await getMyAnimals().catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });

  it('500 → lança', async () => {
    answer(ANIMALS_URL, { message: 'erro' }, 500);

    await expect(getMyAnimals()).rejects.toThrow('GET /me/animals failed: 500');
  });
});
