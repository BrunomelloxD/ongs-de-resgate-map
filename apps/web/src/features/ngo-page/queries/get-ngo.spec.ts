import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import { makeNgo, makeNgoAnimal } from '../test-fixtures';
import { getNgo, getNgoAnimals } from './get-ngo';

const NGO_URL = `${TEST_API_URL}/api/v1/ngos/patas-do-bairro`;
const ANIMALS_URL = `${NGO_URL}/animals`;

function answer(url: string, body: unknown, status = 200) {
  const calls: Request[] = [];
  server.use(
    http.get(url, ({ request }) => {
      calls.push(request);
      return status === 404
        ? new HttpResponse(null, { status })
        : HttpResponse.json(body as object, { status });
    }),
  );
  return calls;
}

const PAGE = {
  data: [makeNgoAnimal()],
  meta: { total: 1, page: 1, limit: 12, last_page: 1 },
};

describe('getNgo', () => {
  it('NGO-01: 200 → a ONG da api, com o token interno', async () => {
    const calls = answer(NGO_URL, makeNgo());

    await expect(getNgo('patas-do-bairro')).resolves.toEqual(makeNgo());
    expect(calls[0]!.headers.get('x-internal-token')).toBe(
      process.env['INTERNAL_API_TOKEN'],
    );
  });

  it('NGO-11: 404 → null', async () => {
    answer(NGO_URL, null, 404);

    await expect(getNgo('patas-do-bairro')).resolves.toBeNull();
  });

  it('500 → lança (cai no error.tsx)', async () => {
    answer(NGO_URL, { message: 'erro' }, 500);

    await expect(getNgo('patas-do-bairro')).rejects.toThrow(
      'GET /ngos/patas-do-bairro failed: 500',
    );
  });
});

describe('getNgoAnimals', () => {
  it('NGO-05: sem filtros, pede available=true e a página', async () => {
    const calls = answer(ANIMALS_URL, PAGE);

    await expect(getNgoAnimals('patas-do-bairro', {}, 1)).resolves.toEqual(
      PAGE,
    );
    const query = new URL(calls[0]!.url).searchParams;
    expect(Object.fromEntries(query)).toEqual({ page: '1', available: 'true' });
  });

  it('NGO-06/07/10: repassa espécie, sexo, porte, available=false e a página', async () => {
    const calls = answer(ANIMALS_URL, PAGE);

    await getNgoAnimals(
      'patas-do-bairro',
      { species: 'CAT', sex: 'FEMALE', size: 'SMALL', available: false },
      2,
    );

    expect(Object.fromEntries(new URL(calls[0]!.url).searchParams)).toEqual({
      page: '2',
      species: 'CAT',
      sex: 'FEMALE',
      size: 'SMALL',
      available: 'false',
    });
  });

  it('NGO-11: 404 → null', async () => {
    answer(ANIMALS_URL, null, 404);

    await expect(
      getNgoAnimals('patas-do-bairro', { available: true }, 1),
    ).resolves.toBeNull();
  });

  it('500 → lança', async () => {
    answer(ANIMALS_URL, { message: 'erro' }, 500);

    await expect(
      getNgoAnimals('patas-do-bairro', { available: true }, 1),
    ).rejects.toThrow('GET /ngos/patas-do-bairro/animals failed: 500');
  });
});
