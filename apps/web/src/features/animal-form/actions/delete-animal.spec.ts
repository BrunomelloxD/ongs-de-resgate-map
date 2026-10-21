import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { deleteAnimal } from './delete-animal';

const store = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.44' }),
}));

const ID = '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';
const URL_ = `${TEST_API_URL}/api/v1/me/animals/${ID}`;
const FAILED = 'Não foi possível excluir agora. Tente de novo.';

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

function apiAnswers(response: () => Response) {
  const calls: Request[] = [];
  server.use(
    http.delete(URL_, ({ request }) => {
      calls.push(request);
      return response();
    }),
  );
  return calls;
}

beforeEach(() => {
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('deleteAnimal', () => {
  it('AFORM-16: 204 apaga com a sessão e redireciona para /painel', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    const error = await deleteAnimal(ID).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/painel');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.headers.get('authorization')).toBe('Bearer token-abc');
  });

  it('AFORM-16: 503 (bucket fora) devolve "Não foi possível excluir agora. Tente de novo."', async () => {
    apiAnswers(() => HttpResponse.json({ message: FAILED }, { status: 503 }));

    await expect(deleteAnimal(ID)).resolves.toEqual({
      ok: false,
      error: FAILED,
    });
  });

  it.each([
    [
      '404 (animal de outra ONG)',
      () => new HttpResponse(null, { status: 404 }),
    ],
    ['api fora do ar', () => HttpResponse.error()],
  ])('%s devolve a mesma mensagem, sem redirecionar', async (_case, answer) => {
    apiAnswers(answer);

    await expect(deleteAnimal(ID)).resolves.toEqual({
      ok: false,
      error: FAILED,
    });
  });

  it('id malformado não chega à api', async () => {
    const calls = apiAnswers(() => new HttpResponse(null, { status: 204 }));

    await expect(deleteAnimal('nao-e-uuid')).resolves.toEqual({
      ok: false,
      error: FAILED,
    });
    expect(calls).toHaveLength(0);
  });

  it('AUTH-07: 401 → /session/end', async () => {
    apiAnswers(() => HttpResponse.json({ message: 'x' }, { status: 401 }));

    const error = await deleteAnimal(ID).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
