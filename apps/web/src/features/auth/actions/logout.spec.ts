import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { logout } from './logout';

const store = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.30' }),
}));

const LOGOUT_URL = `${TEST_API_URL}/api/v1/auth/sessions/current`;

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

function apiAnswers(response: () => Response) {
  const calls: Request[] = [];
  server.use(
    http.delete(LOGOUT_URL, ({ request }) => {
      calls.push(request);
      return response();
    }),
  );
  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('logout', () => {
  it('AUTH-05: 204 revoga o token na api, apaga o cookie e abre /entrar', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    const error = await logout().catch((e: unknown) => e);

    expect(calls[0]!.headers.get('authorization')).toBe('Bearer token-abc');
    expect(store.delete).toHaveBeenCalledWith('ah_session');
    expect(redirectTarget(error)).toBe('/entrar');
  });

  it('AUTH-05: com 500 da api, apaga o cookie e abre /entrar mesmo assim', async () => {
    apiAnswers(() => HttpResponse.json({ message: 'x' }, { status: 500 }));

    const error = await logout().catch((e: unknown) => e);

    expect(store.delete).toHaveBeenCalledWith('ah_session');
    expect(redirectTarget(error)).toBe('/entrar');
  });

  it('AUTH-05: com a api fora do ar, apaga o cookie e abre /entrar', async () => {
    apiAnswers(() => HttpResponse.error());

    const error = await logout().catch((e: unknown) => e);

    expect(store.delete).toHaveBeenCalledWith('ah_session');
    expect(redirectTarget(error)).toBe('/entrar');
  });

  it('AUTH-07: sem cookie, segue para /session/end, que apaga o cookie', async () => {
    store.get.mockReturnValue(undefined);

    const error = await logout().catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
