import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { makeMyAnimal } from '../test-fixtures';
import { getMyAnimal } from './get-my-animal';

const store = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.45' }),
}));

const ANIMALS_URL = `${TEST_API_URL}/api/v1/me/animals`;
const OTHER_ID = 'a0000000-0000-4000-8000-000000000009';

function answer(body: unknown, status = 200) {
  const calls: Request[] = [];
  server.use(
    http.get(ANIMALS_URL, ({ request }) => {
      calls.push(request);
      return HttpResponse.json(body as object, { status });
    }),
  );
  return calls;
}

function redirectTarget(error: unknown): string {
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

beforeEach(() => {
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('getMyAnimal', () => {
  it('AFORM-13: acha o animal da ONG na lista do GET /me/animals', async () => {
    const animal = makeMyAnimal();
    const calls = answer([makeMyAnimal({ id: OTHER_ID }), animal]);

    await expect(getMyAnimal(animal.id)).resolves.toEqual(animal);
    expect(calls[0]!.headers.get('authorization')).toBe('Bearer token-abc');
  });

  it('SEC-06: id que não está na lista da ONG (outra ONG, excluído ou malformado) → null', async () => {
    answer([makeMyAnimal()]);

    await expect(getMyAnimal(OTHER_ID)).resolves.toBeNull();
    await expect(getMyAnimal('nao-e-uuid')).resolves.toBeNull();
  });

  it('AUTH-07: 401 → /session/end', async () => {
    answer({ message: 'Unauthorized' }, 401);

    const error = await getMyAnimal(OTHER_ID).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });

  it('500 → lança (cai no error.tsx)', async () => {
    answer({ message: 'erro' }, 500);

    await expect(getMyAnimal(OTHER_ID)).rejects.toThrow(
      'GET /me/animals failed: 500',
    );
  });
});
