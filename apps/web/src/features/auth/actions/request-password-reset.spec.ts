import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { requestPasswordReset } from './request-password-reset';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.40' }),
}));

const RESET_URL = `${TEST_API_URL}/api/v1/auth/password-resets`;
const INITIAL = { email: '' };

function form(email?: string) {
  const data = new FormData();
  if (email !== undefined) data.set('email', email);
  return data;
}

function apiAnswers(response: () => Response) {
  const calls: { request: Request; body: unknown }[] = [];
  server.use(
    http.post(RESET_URL, async ({ request }) => {
      calls.push({ request, body: await request.clone().json() });
      return response();
    }),
  );
  return calls;
}

describe('requestPasswordReset', () => {
  it('AUTH-08: 202 devolve "Se houver uma conta com este e-mail, enviamos um link."', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 202 }));

    await expect(
      requestPasswordReset(INITIAL, form(' contato@patas.org ')),
    ).resolves.toEqual({
      email: 'contato@patas.org',
      sentMessage: 'Se houver uma conta com este e-mail, enviamos um link.',
    });
    expect(calls[0]!.body).toEqual({ email: 'contato@patas.org' });
    expect(calls[0]!.request.headers.get('x-client-ip')).toBe('198.51.100.40');
  });

  it('AUTH-11: 429 devolve "Muitos pedidos. Tente de novo em 1 hora."', async () => {
    apiAnswers(() =>
      HttpResponse.json(
        { message: 'Muitos pedidos.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
      ),
    );

    await expect(
      requestPasswordReset(INITIAL, form('contato@patas.org')),
    ).resolves.toEqual({
      email: 'contato@patas.org',
      formError: 'Muitos pedidos. Tente de novo em 1 hora.',
    });
  });

  it('outro erro da api devolve a mensagem genérica', async () => {
    apiAnswers(() => HttpResponse.json({ message: 'x' }, { status: 500 }));

    await expect(
      requestPasswordReset(INITIAL, form('contato@patas.org')),
    ).resolves.toEqual({
      email: 'contato@patas.org',
      formError: 'Não foi possível enviar o link agora. Tente de novo.',
    });
  });

  it.each([undefined, '', 'nao-e-email'])(
    'e-mail inválido (%j) é recusado antes da api',
    async (email) => {
      const calls = apiAnswers(() => new HttpResponse(null, { status: 202 }));

      await expect(requestPasswordReset(INITIAL, form(email))).resolves.toEqual(
        {
          email: email ?? '',
          fieldError: 'Informe um e-mail válido, como nome@ong.org.',
        },
      );
      expect(calls).toHaveLength(0);
    },
  );
});
