import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { resetPassword } from './reset-password';

const RESET_URL = `${TEST_API_URL}/api/v1/auth/password-resets/:token`;
const INITIAL = { fieldErrors: {} };

function form(password: string, confirmation = password) {
  const data = new FormData();
  data.set('password', password);
  data.set('confirmation', confirmation);
  return data;
}

function apiAnswers(response: () => Response) {
  const calls: { token: unknown; body: unknown }[] = [];
  server.use(
    http.post(RESET_URL, async ({ request, params }) => {
      calls.push({ token: params['token'], body: await request.json() });
      return response();
    }),
  );
  return calls;
}

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

describe('resetPassword', () => {
  it('AUTH-12: 204 abre /entrar?senha=alterada', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    const error = await resetPassword(
      'token-do-link',
      INITIAL,
      form('novaSenha99'),
    ).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/entrar?senha=alterada');
    expect(calls).toEqual([
      { token: 'token-do-link', body: { password: 'novaSenha99' } },
    ]);
  });

  it('AUTH-13: 410 devolve "Este link expirou ou já foi usado."', async () => {
    apiAnswers(() =>
      HttpResponse.json(
        { message: 'Este link expirou ou já foi usado.' },
        { status: 410 },
      ),
    );

    await expect(
      resetPassword('usado', INITIAL, form('novaSenha99')),
    ).resolves.toEqual({
      fieldErrors: {},
      linkGone: 'Este link expirou ou já foi usado.',
    });
  });

  it('outro erro da api devolve a mensagem genérica', async () => {
    apiAnswers(() => HttpResponse.json({ message: 'x' }, { status: 500 }));

    await expect(
      resetPassword('token', INITIAL, form('novaSenha99')),
    ).resolves.toEqual({
      fieldErrors: {},
      formError: 'Não foi possível trocar a senha agora. Tente de novo.',
    });
  });

  it('SIGN-15: senha sem número é recusada antes da api', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    await expect(
      resetPassword('token', INITIAL, form('senhasemnumero')),
    ).resolves.toEqual({
      fieldErrors: { password: 'A senha precisa de ao menos um número.' },
    });
    expect(calls).toHaveLength(0);
  });

  it('SIGN-16: confirmação diferente devolve "As senhas não conferem." antes da api', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    await expect(
      resetPassword('token', INITIAL, form('novaSenha99', 'novaSenha98')),
    ).resolves.toEqual({
      fieldErrors: { confirmation: 'As senhas não conferem.' },
    });
    expect(calls).toHaveLength(0);
  });
});
