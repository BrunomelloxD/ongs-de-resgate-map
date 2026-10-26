import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { deleteAccount } from './delete-account';

const store = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.44' }),
}));

const NGO_URL = `${TEST_API_URL}/api/v1/me/ngo`;

function apiAnswers(response: () => Response) {
  const calls: { auth: string | null; body: unknown }[] = [];
  server.use(
    http.delete(NGO_URL, async ({ request }) => {
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
  vi.clearAllMocks();
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('deleteAccount', () => {
  it('PROF-08: 204 apaga o cookie e abre /?conta=excluida', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    const error = await deleteAccount('senha1234').catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/?conta=excluida');
    expect(store.delete).toHaveBeenCalledWith('ah_session');
    expect(calls).toEqual([
      { auth: 'Bearer token-abc', body: { password: 'senha1234' } },
    ]);
  });

  it('PROF-08: 403 → "Senha atual incorreta.", e o cookie fica', async () => {
    apiAnswers(() =>
      HttpResponse.json({ message: 'Senha atual incorreta.' }, { status: 403 }),
    );

    await expect(deleteAccount('errada123')).resolves.toEqual({
      error: 'Senha atual incorreta.',
    });
    expect(store.delete).not.toHaveBeenCalled();
  });

  it('PROF-08: 503 (bucket fora, nada apagado) → "Não foi possível excluir agora. Tente de novo."', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 503 }));

    await expect(deleteAccount('senha1234')).resolves.toEqual({
      error: 'Não foi possível excluir agora. Tente de novo.',
    });
    expect(store.delete).not.toHaveBeenCalled();
  });

  it('sem senha, nada vai à api', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    await expect(deleteAccount('')).resolves.toEqual({
      error: 'Informe a senha atual.',
    });
    await expect(
      deleteAccount(undefined as unknown as string),
    ).resolves.toEqual({ error: 'Informe a senha atual.' });
    expect(calls).toHaveLength(0);
  });

  it('AUTH-07: 401 → /session/end', async () => {
    apiAnswers(() => new HttpResponse(null, { status: 401 }));

    const error = await deleteAccount('senha1234').catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
