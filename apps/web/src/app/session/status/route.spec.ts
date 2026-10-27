import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { GET } from './route';

const store = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers(),
}));

const ME_URL = `${TEST_API_URL}/api/v1/me/ngo`;
// Only the fields the handler reads; the rest of NgoMeDto must not leak.
const NGO = {
  legalName: 'Patas do Bairro',
  imageUrl: '/img/ngos/1/logo/abc-600.webp',
  email: 'contato@patas.org',
  cnpj: '11222333000181',
  whatsapp: '5511987654321',
};

function request() {
  return new Request('http://web.test/session/status', {
    headers: { 'x-forwarded-for': '203.0.113.9' },
  });
}

function apiAnswers(body: unknown, status = 200) {
  const calls: Request[] = [];
  server.use(
    http.get(ME_URL, ({ request: call }) => {
      calls.push(call);
      return HttpResponse.json(body as object, { status });
    }),
  );
  return calls;
}

function expectNoCookieWritten(response: Response) {
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(store.set).not.toHaveBeenCalled();
  expect(store.delete).not.toHaveBeenCalled();
}

describe('GET /session/status', () => {
  it('sem cookie → { loggedIn: false }, sem Set-Cookie e sem chamar a api (SEC-03)', async () => {
    store.get.mockReturnValue(undefined);
    const calls = apiAnswers(NGO);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ loggedIn: false });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(calls).toHaveLength(0);
    expectNoCookieWritten(response);
  });

  it('com sessão válida → só o nome e o avatar, pedidos com o Bearer e o IP', async () => {
    store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
    const calls = apiAnswers(NGO);

    const response = await GET(request());

    expect(await response.json()).toEqual({
      loggedIn: true,
      name: 'Patas do Bairro',
      avatarUrl: '/img/ngos/1/logo/abc-600.webp',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(store.get).toHaveBeenCalledWith('ah_session');
    expect(calls[0]!.headers.get('authorization')).toBe('Bearer token-abc');
    expect(calls[0]!.headers.get('x-client-ip')).toBe('203.0.113.9');
    expectNoCookieWritten(response);
  });

  it('com sessão válida e sem imagem → sem avatarUrl', async () => {
    store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
    apiAnswers({ ...NGO, imageUrl: null });

    const response = await GET(request());

    expect(await response.json()).toEqual({
      loggedIn: true,
      name: 'Patas do Bairro',
    });
  });

  it.each([401, 500])(
    '%s da api → { loggedIn: false }, sem apagar nem gravar cookie',
    async (status) => {
      store.get.mockReturnValue({ name: 'ah_session', value: 'vencido' });
      apiAnswers({ message: 'erro' }, status);

      const response = await GET(request());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ loggedIn: false });
      expect(response.headers.get('cache-control')).toBe('no-store');
      expectNoCookieWritten(response);
    },
  );
});
