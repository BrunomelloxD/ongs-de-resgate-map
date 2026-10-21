import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../test/msw/server';
import {
  clearSessionCookie,
  getAuthedApi,
  getSessionToken,
  setSessionCookie,
} from './session';

const store = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
const requestHeaders = vi.hoisted(() => ({ value: undefined as unknown }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => requestHeaders.value,
}));

beforeEach(() => {
  vi.clearAllMocks();
  requestHeaders.value = new Headers({ 'x-forwarded-for': '203.0.113.5' });
});

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

describe('getSessionToken', () => {
  it('lê o cookie ah_session', async () => {
    store.get.mockReturnValue({ name: 'ah_session', value: 'abc' });

    await expect(getSessionToken()).resolves.toBe('abc');
    expect(store.get).toHaveBeenCalledWith('ah_session');
  });

  it('sem o cookie devolve undefined', async () => {
    store.get.mockReturnValue(undefined);

    await expect(getSessionToken()).resolves.toBeUndefined();
  });
});

describe('setSessionCookie', () => {
  it('grava o ah_session com HttpOnly, Secure, SameSite=Lax e Path=/ e Max-Age de 1 dia (AUTH-02)', async () => {
    await setSessionCookie('token-123');

    expect(store.set).toHaveBeenCalledWith('ah_session', 'token-123', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });
  });
});

describe('clearSessionCookie', () => {
  it('apaga o ah_session', async () => {
    await clearSessionCookie();

    expect(store.delete).toHaveBeenCalledWith('ah_session');
  });
});

describe('getAuthedApi', () => {
  it('sem cookie redireciona para /session/end', async () => {
    store.get.mockReturnValue(undefined);

    const error = await getAuthedApi().catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });

  it('envia o token como Bearer, o IP e o token interno', async () => {
    store.get.mockReturnValue({ value: 'session-abc' });
    let received: Headers | undefined;
    server.use(
      http.get(`${TEST_API_URL}/health`, ({ request }) => {
        received = request.headers;
        return HttpResponse.json({ status: 'ok' });
      }),
    );

    const api = await getAuthedApi();
    const { data } = await api.GET('/health');

    expect(data).toEqual({ status: 'ok' });
    expect(received?.get('authorization')).toBe('Bearer session-abc');
    expect(received?.get('x-client-ip')).toBe('203.0.113.5');
    expect(received?.get('x-internal-token')).toBe(
      process.env['INTERNAL_API_TOKEN'],
    );
  });

  it('resposta 401 da api redireciona para /session/end', async () => {
    store.get.mockReturnValue({ value: 'expired' });
    server.use(
      http.get(`${TEST_API_URL}/health`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    );
    const api = await getAuthedApi();

    const error = await api.GET('/health').catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });

  it.each([403, 404, 500])('resposta %i não redireciona', async (status) => {
    store.get.mockReturnValue({ value: 'ok' });
    server.use(
      http.get(`${TEST_API_URL}/health`, () =>
        HttpResponse.json({ message: 'x' }, { status }),
      ),
    );
    const api = await getAuthedApi();

    const { response } = await api.GET('/health');

    expect(response.status).toBe(status);
  });
});
