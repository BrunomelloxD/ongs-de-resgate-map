import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../test/msw/server';
import { getApi } from './api';

const TOKEN = process.env['INTERNAL_API_TOKEN'];

function captureHeaders() {
  const received: { headers?: Headers } = {};

  server.use(
    http.get(`${TEST_API_URL}/health`, ({ request }) => {
      received.headers = request.headers;
      return HttpResponse.json({ status: 'ok' });
    }),
  );

  return received;
}

describe('getApi', () => {
  it('cria o client apontando para a API_URL', async () => {
    server.use(
      http.get(`${TEST_API_URL}/health`, () =>
        HttpResponse.json({ status: 'ok' }),
      ),
    );

    const { data } = await getApi().GET('/health');

    expect(data).toEqual({ status: 'ok' });
  });

  it('envia X-Internal-Token, X-Client-IP e Authorization quando informados', async () => {
    const received = captureHeaders();

    await getApi({ clientIp: '203.0.113.5', token: 'session-token' }).GET(
      '/health',
    );

    expect(received.headers?.get('x-internal-token')).toBe(TOKEN);
    expect(received.headers?.get('x-client-ip')).toBe('203.0.113.5');
    expect(received.headers?.get('authorization')).toBe('Bearer session-token');
  });

  it('sem clientIp e sem token, só envia o X-Internal-Token', async () => {
    const received = captureHeaders();

    await getApi().GET('/health');

    expect(received.headers?.get('x-internal-token')).toBe(TOKEN);
    expect(received.headers?.has('x-client-ip')).toBe(false);
    expect(received.headers?.has('authorization')).toBe(false);
  });

  it('T177: uma chamada não usa Math.random (o Next acusa o valor instável ao pré-renderizar)', async () => {
    // A plain fetch stub: MSW's interceptor draws its own Math.random() request ids.
    const fetch = vi.fn(async (_request: Request) => Response.json({}));
    vi.stubGlobal('fetch', fetch);
    const random = vi.spyOn(Math, 'random');

    await getApi({ clientIp: '203.0.113.5' }).GET('/health');

    expect(random).not.toHaveBeenCalled();
    expect(fetch.mock.calls[0]![0].headers.get('x-client-ip')).toBe(
      '203.0.113.5',
    );
    random.mockRestore();
    vi.unstubAllGlobals();
  });
});
