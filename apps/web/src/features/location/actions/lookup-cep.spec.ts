import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { makeCepAddress } from '../test-fixtures';
import { lookupCep } from './lookup-cep';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.7' }),
}));

const CEP_URL = `${TEST_API_URL}/api/v1/geo/cep/:cep`;

function apiAnswers(body: unknown, status = 200) {
  const calls: Request[] = [];
  server.use(
    http.get(CEP_URL, ({ request }) => {
      calls.push(request);
      return body === null
        ? new HttpResponse(null, { status })
        : HttpResponse.json(body as object, { status });
    }),
  );
  return calls;
}

describe('lookupCep', () => {
  it('LOC-09: 200 devolve o endereço com a coordenada', async () => {
    const address = makeCepAddress();
    const calls = apiAnswers(address);

    await expect(lookupCep('01310-100')).resolves.toEqual({
      ok: true,
      address,
    });
    expect(new URL(calls[0]!.url).pathname).toBe('/api/v1/geo/cep/01310100');
    expect(calls[0]!.headers.get('x-client-ip')).toBe('198.51.100.7');
  });

  it('LOC-10: 404 devolve "CEP não encontrado. Confira os números ou busque pela cidade."', async () => {
    apiAnswers({ message: 'CEP não encontrado.' }, 404);

    await expect(lookupCep('00000000')).resolves.toEqual({
      ok: false,
      error: 'CEP não encontrado. Confira os números ou busque pela cidade.',
    });
  });

  it('LOC-11: 503 devolve "Não conseguimos buscar o CEP agora. Tente pela cidade."', async () => {
    apiAnswers({ message: 'Indisponível' }, 503);

    await expect(lookupCep('01310100')).resolves.toEqual({
      ok: false,
      error: 'Não conseguimos buscar o CEP agora. Tente pela cidade.',
    });
  });

  it('outro erro da api também vira a mensagem do LOC-11', async () => {
    apiAnswers(null, 500);

    await expect(lookupCep('01310100')).resolves.toEqual({
      ok: false,
      error: 'Não conseguimos buscar o CEP agora. Tente pela cidade.',
    });
  });

  it.each(['0131010', '01310-10', '', 'abc'])(
    'CEP com menos de 8 dígitos (%j) não chama a api',
    async (cep) => {
      const calls = apiAnswers(makeCepAddress());

      await expect(lookupCep(cep)).resolves.toEqual({
        ok: false,
        error: 'Digite os 8 números do CEP.',
      });
      expect(calls).toHaveLength(0);
    },
  );
});
