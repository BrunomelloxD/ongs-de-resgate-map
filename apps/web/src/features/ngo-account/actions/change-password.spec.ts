import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { changePassword } from './change-password';

const store = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.43' }),
}));

const PASSWORD_URL = `${TEST_API_URL}/api/v1/me/password`;
const INITIAL = { fieldErrors: {} };

function form(
  currentPassword: string,
  password: string,
  confirmation = password,
) {
  const data = new FormData();
  data.set('currentPassword', currentPassword);
  data.set('password', password);
  data.set('confirmation', confirmation);
  return data;
}

function apiAnswers(response: () => Response) {
  const calls: { auth: string | null; body: unknown }[] = [];
  server.use(
    http.put(PASSWORD_URL, async ({ request }) => {
      calls.push({
        auth: request.headers.get('authorization'),
        body: await request.json(),
      });
      return response();
    }),
  );
  return calls;
}

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

beforeEach(() => {
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('changePassword', () => {
  it('PROF-05: 204 → mensagem de senha alterada, com a sessão atual', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    const state = await changePassword(
      INITIAL,
      form('antiga123', 'novaSenha99'),
    );

    expect(state).toEqual({
      fieldErrors: {},
      success: {
        message: 'Senha alterada. As outras sessões foram encerradas.',
        at: expect.any(Number),
      },
    });
    expect(calls).toEqual([
      {
        auth: 'Bearer token-abc',
        body: { currentPassword: 'antiga123', password: 'novaSenha99' },
      },
    ]);
  });

  it('PROF-06: 403 → "Senha atual incorreta." no campo da senha atual', async () => {
    apiAnswers(() =>
      HttpResponse.json({ message: 'Senha atual incorreta.' }, { status: 403 }),
    );

    await expect(
      changePassword(INITIAL, form('errada123', 'novaSenha99')),
    ).resolves.toEqual({
      fieldErrors: { currentPassword: 'Senha atual incorreta.' },
    });
  });

  it('404 (a ONG da sessão não existe mais) → "ONG não encontrada."', async () => {
    apiAnswers(() =>
      HttpResponse.json({ message: 'ONG não encontrada.' }, { status: 404 }),
    );

    await expect(
      changePassword(INITIAL, form('antiga123', 'novaSenha99')),
    ).resolves.toEqual({ fieldErrors: {}, formError: 'ONG não encontrada.' });
  });

  it('500 → erro geral', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 500 }));

    await expect(
      changePassword(INITIAL, form('antiga123', 'novaSenha99')),
    ).resolves.toEqual({
      fieldErrors: {},
      formError: 'Não foi possível alterar a senha agora. Tente de novo.',
    });
  });

  it('SIGN-15/SIGN-16: valida a senha atual, as regras e a confirmação sem chamar a api', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    await expect(
      changePassword(INITIAL, form('', 'curta', 'outra')),
    ).resolves.toEqual({
      fieldErrors: {
        currentPassword: 'Informe a senha atual.',
        password: 'A senha precisa de 8 ou mais caracteres.',
        confirmation: 'As senhas não conferem.',
      },
    });
    expect(calls).toHaveLength(0);
  });

  it('AUTH-07: 401 → /session/end', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 401 }));

    const error = await changePassword(
      INITIAL,
      form('antiga123', 'novaSenha99'),
    ).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
