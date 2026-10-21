import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { makeAnimal } from '../test-fixtures';
import { getAnimal } from './get-animal';

const ID = '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';

function answer(status: number, body?: unknown) {
  const calls: Request[] = [];
  server.use(
    http.get(`${TEST_API_URL}/api/v1/animals/${ID}`, ({ request }) => {
      calls.push(request);
      return body
        ? HttpResponse.json(body as object, { status })
        : new HttpResponse(null, { status });
    }),
  );
  return calls;
}

describe('getAnimal', () => {
  it('ANI-01: 200 → o animal, pedindo pelo id e pelo slug', async () => {
    const calls = answer(200, makeAnimal());

    await expect(getAnimal('patas-do-bairro', ID)).resolves.toEqual(
      makeAnimal(),
    );
    expect(new URL(calls[0]!.url).searchParams.get('slug')).toBe(
      'patas-do-bairro',
    );
    expect(calls[0]!.headers.get('x-internal-token')).toBe(
      process.env['INTERNAL_API_TOKEN'],
    );
  });

  it('ANI-06: 404 → null', async () => {
    answer(404, { message: 'Animal não encontrado.' });

    await expect(getAnimal('outra-ong', ID)).resolves.toBeNull();
  });

  it('500 → lança (cai no error.tsx)', async () => {
    answer(500);

    await expect(getAnimal('patas-do-bairro', ID)).rejects.toThrow(
      `GET /animals/${ID} failed: 500`,
    );
  });
});
