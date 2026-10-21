import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { login } from './login';

const store = vi.hoisted(() => ({ set: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.20' }),
}));

const LOGIN_URL = `${TEST_API_URL}/api/v1/auth/sessions`;
const INITIAL = { email: '', fieldErrors: {} };

function form(email: string, password: string) {
  const data = new FormData();
  data.set('email', email);
  data.set('password', password);
  return data;
}

function apiAnswers(status: number, body: object) {
  const calls: { request: Request; body: unknown }[] = [];
  server.use(
    http.post(LOGIN_URL, async ({ request }) => {
      calls.push({ request, body: await request.clone().json() });
      return HttpResponse.json(body, { status });
    }),
  );
  return calls;
}

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

beforeEach(() => vi.clearAllMocks());

describe('login', () => {
  it('AUTH-02: sucesso grava o cookie da sessão e abre /painel', async () => {
    const calls = apiAnswers(201, { token: 'token-abc' });

    const error = await login(
      INITIAL,
      form(' contato@patas.org ', 'senha1234'),
    ).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/painel');
    expect(store.set).toHaveBeenCalledWith('ah_session', 'token-abc', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });
    expect(calls[0]!.body).toEqual({
      email: 'contato@patas.org',
      password: 'senha1234',
    });
  });

  it('AUTH-04 (AD-002): o handler recebe o IP do visitante em X-Client-IP', async () => {
    const calls = apiAnswers(201, { token: 'token-abc' });

    await login(INITIAL, form('contato@patas.org', 'senha1234')).catch(
      () => undefined,
    );

    expect(calls[0]!.request.headers.get('x-client-ip')).toBe('198.51.100.20');
  });

  it('AUTH-03: 401 devolve "E-mail ou senha incorretos." sem gravar cookie', async () => {
    apiAnswers(401, { message: 'E-mail ou senha incorretos.' });

    await expect(
      login(INITIAL, form('contato@patas.org', 'errada123')),
    ).resolves.toEqual({
      email: 'contato@patas.org',
      fieldErrors: {},
      formError: 'E-mail ou senha incorretos.',
    });
    expect(store.set).not.toHaveBeenCalled();
  });

  it('AUTH-04: 429 devolve "Muitas tentativas. Tente de novo em 15 minutos."', async () => {
    apiAnswers(429, { message: 'Muitas tentativas.' });

    await expect(
      login(INITIAL, form('contato@patas.org', 'errada123')),
    ).resolves.toEqual({
      email: 'contato@patas.org',
      fieldErrors: {},
      formError: 'Muitas tentativas. Tente de novo em 15 minutos.',
    });
  });

  it('outro erro da api devolve a mensagem genérica', async () => {
    apiAnswers(500, { message: 'Internal' });

    await expect(
      login(INITIAL, form('contato@patas.org', 'senha1234')),
    ).resolves.toMatchObject({
      formError: 'Não foi possível entrar agora. Tente de novo.',
    });
  });

  it('e-mail inválido e senha vazia são recusados antes da api', async () => {
    const calls = apiAnswers(201, { token: 'x' });

    await expect(login(INITIAL, form('nao-e-email', ''))).resolves.toEqual({
      email: 'nao-e-email',
      fieldErrors: {
        email: 'Informe um e-mail válido, como nome@ong.org.',
        password: 'Informe a senha.',
      },
    });
    expect(calls).toHaveLength(0);
  });

  it('campos ausentes no FormData contam como vazios', async () => {
    const calls = apiAnswers(201, { token: 'x' });

    await expect(login(INITIAL, new FormData())).resolves.toMatchObject({
      email: '',
      fieldErrors: {
        email: 'Informe um e-mail válido, como nome@ong.org.',
        password: 'Informe a senha.',
      },
    });
    expect(calls).toHaveLength(0);
  });
});
