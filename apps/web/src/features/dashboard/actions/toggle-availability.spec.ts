import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { makeMyAnimal } from '../test-fixtures';
import { toggleAvailability } from './toggle-availability';

const store = vi.hoisted(() => ({ get: vi.fn() }));
const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.41' }),
}));
vi.mock('next/cache', () => ({ refresh }));

const ID = '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';
const URL_ = `${TEST_API_URL}/api/v1/me/animals/${ID}/availability`;

function redirectTarget(error: unknown): string {
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

function apiAnswers(response: () => Response) {
  const bodies: unknown[] = [];
  server.use(
    http.patch(URL_, async ({ request }) => {
      bodies.push(await request.json());
      return response();
    }),
  );
  return bodies;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('toggleAvailability', () => {
  it('DASH-02: 200 → { ok: true }, envia o novo valor e atualiza a página', async () => {
    const bodies = apiAnswers(() =>
      HttpResponse.json(makeMyAnimal({ available: false })),
    );

    await expect(toggleAvailability(ID, false)).resolves.toEqual({ ok: true });
    expect(bodies).toEqual([{ available: false }]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('DASH-03: 500 → { ok: false }, sem atualizar a página', async () => {
    apiAnswers(() => HttpResponse.json({ message: 'erro' }, { status: 500 }));

    await expect(toggleAvailability(ID, true)).resolves.toEqual({ ok: false });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('DASH-03: 404 (animal de outra ONG) → { ok: false }', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 404 }));

    await expect(toggleAvailability(ID, true)).resolves.toEqual({ ok: false });
  });

  it('DASH-03: api fora do ar → { ok: false }', async () => {
    apiAnswers(() => HttpResponse.error());

    await expect(toggleAvailability(ID, true)).resolves.toEqual({ ok: false });
  });

  it('entrada inválida → { ok: false }, sem chamar a api', async () => {
    const bodies = apiAnswers(() => HttpResponse.json(makeMyAnimal()));

    await expect(toggleAvailability('nao-e-uuid', true)).resolves.toEqual({
      ok: false,
    });
    await expect(
      toggleAvailability(ID, 'sim' as unknown as boolean),
    ).resolves.toEqual({ ok: false });
    expect(bodies).toEqual([]);
  });

  it('AUTH-07: 401 → /session/end', async () => {
    apiAnswers(() => HttpResponse.json({ message: 'x' }, { status: 401 }));

    const error = await toggleAvailability(ID, true).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
