import { http, HttpResponse } from 'msw';
import { server, TEST_API_URL } from '../../../../test/msw/server';
import type { AnimalFormValues } from '../animal-form.types';
import { makeMyAnimal } from '../test-fixtures';
import { saveAnimal } from './save-animal';

const store = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.43' }),
}));

const ID = '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';
const CREATE_URL = `${TEST_API_URL}/api/v1/me/animals`;
const UPDATE_URL = `${CREATE_URL}/${ID}`;
const P1 = '00000001-0000-4000-8000-000000000000';
const P2 = '00000002-0000-4000-8000-000000000000';
const P3 = '00000003-0000-4000-8000-000000000000';

const VALUES: AnimalFormValues = {
  name: ' Caramelo ',
  species: 'DOG',
  sex: 'MALE',
  size: 'MEDIUM',
  ageValue: '3',
  ageUnit: 'YEARS',
  breed: 'SRD (vira-lata)',
  description: '',
  imageIds: [P3, P1, P2],
};

function redirectTarget(error: unknown): string {
  // Next's redirect error digest: NEXT_REDIRECT;<type>;<url>;<status>;
  return String((error as { digest?: string }).digest).split(';')[2] ?? '';
}

function apiAnswers(
  method: 'post' | 'patch',
  url: string,
  response: () => Response,
) {
  const bodies: unknown[] = [];
  server.use(
    http[method](url, async ({ request }) => {
      bodies.push(await request.json());
      return response();
    }),
  );
  return bodies;
}

const created = () => HttpResponse.json(makeMyAnimal(), { status: 201 });

beforeEach(() => {
  store.get.mockReturnValue({ name: 'ah_session', value: 'token-abc' });
});

describe('saveAnimal', () => {
  it('AFORM-01/10/11: cria com POST, `imageIds` na ordem recebida, e vai para /painel', async () => {
    const bodies = apiAnswers('post', CREATE_URL, created);

    const error = await saveAnimal(null, VALUES).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/painel');
    expect(bodies).toEqual([
      {
        name: 'Caramelo',
        species: 'DOG',
        sex: 'MALE',
        size: 'MEDIUM',
        ageValue: 3,
        ageUnit: 'YEARS',
        breed: 'SRD (vira-lata)',
        description: null,
        imageIds: [P3, P1, P2],
      },
    ]);
  });

  it('AFORM-13/14: edita com PATCH no id, com a lista final de fotos', async () => {
    const bodies = apiAnswers('patch', UPDATE_URL, () =>
      HttpResponse.json(makeMyAnimal()),
    );

    const error = await saveAnimal(ID, {
      ...VALUES,
      name: 'Caramelo Jr.',
      imageIds: [P2],
    }).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/painel');
    expect(bodies).toMatchObject([{ name: 'Caramelo Jr.', imageIds: [P2] }]);
  });

  it('DEMO-09: 409 da cota de animais devolve a mensagem do spec', async () => {
    const message =
      'Sua ONG atingiu o limite de 10 animais da demo. Exclua um animal para cadastrar outro.';
    apiAnswers('post', CREATE_URL, () =>
      HttpResponse.json({ message }, { status: 409 }),
    );

    await expect(saveAnimal(null, VALUES)).resolves.toEqual({
      ok: false,
      error: message,
      fieldErrors: {},
    });
  });

  it('DEMO-10: 409 do limite de fotos devolve a mensagem do spec', async () => {
    const message = 'Este animal já tem o máximo de 3 fotos da demo.';
    apiAnswers('patch', UPDATE_URL, () =>
      HttpResponse.json({ message }, { status: 409 }),
    );

    await expect(saveAnimal(ID, VALUES)).resolves.toEqual({
      ok: false,
      error: message,
      fieldErrors: {},
    });
  });

  it('SEC-06/edge: 404 devolve "Animal não encontrado."', async () => {
    apiAnswers('patch', UPDATE_URL, () =>
      HttpResponse.json({ message: 'Animal não encontrado.' }, { status: 404 }),
    );

    await expect(saveAnimal(ID, VALUES)).resolves.toEqual({
      ok: false,
      error: 'Animal não encontrado.',
      fieldErrors: {},
    });
  });

  it('A11Y-05: 400 da api é mapeado por campo, com o texto do formulário', async () => {
    apiAnswers('post', CREATE_URL, () =>
      HttpResponse.json(
        {
          message: [
            'name must be shorter than or equal to 60 characters',
            'ageValue must not be greater than 30',
            'description must be shorter than or equal to 1000 characters',
            'Adicione pelo menos 1 foto.',
            'algo sem campo',
            42,
          ],
          error: 'Bad Request',
          statusCode: 400,
        },
        { status: 400 },
      ),
    );

    await expect(saveAnimal(null, VALUES)).resolves.toEqual({
      ok: false,
      fieldErrors: {
        name: 'Informe o nome, com até 60 caracteres.',
        ageValue: 'Informe a idade, um número de 0 a 30.',
        description: 'A descrição pode ter até 1000 caracteres.',
        photos: 'Adicione pelo menos 1 foto.',
      },
    });
  });

  it('400 sobre `imageIds` (fora do limite) aponta para as fotos', async () => {
    apiAnswers('post', CREATE_URL, () =>
      HttpResponse.json(
        { message: 'imageIds must contain no more than 8 elements' },
        { status: 400 },
      ),
    );

    await expect(saveAnimal(null, VALUES)).resolves.toEqual({
      ok: false,
      fieldErrors: { photos: 'Confira as fotos e tente de novo.' },
    });
  });

  it('400 sem campo conhecido devolve o erro geral', async () => {
    apiAnswers('post', CREATE_URL, () =>
      HttpResponse.json(
        { message: 'property x should not exist' },
        { status: 400 },
      ),
    );

    await expect(saveAnimal(null, VALUES)).resolves.toEqual({
      ok: false,
      error: 'Confira os campos e tente de novo.',
      fieldErrors: {},
    });
  });

  it('AFORM-05: valida antes da api (sem foto não chama a api)', async () => {
    const bodies = apiAnswers('post', CREATE_URL, created);

    await expect(
      saveAnimal(null, { ...VALUES, imageIds: [] }),
    ).resolves.toEqual({
      ok: false,
      error: undefined,
      fieldErrors: { photos: 'Adicione pelo menos 1 foto.' },
    });
    expect(bodies).toEqual([]);
  });

  it('entrada forjada (id malformado ou corpo que não é objeto) não chega à api', async () => {
    const bodies = apiAnswers('post', CREATE_URL, created);

    await expect(saveAnimal('nao-e-uuid', VALUES)).resolves.toEqual({
      ok: false,
      error: 'Não foi possível salvar o animal. Tente de novo.',
      fieldErrors: {},
    });
    await expect(
      saveAnimal(null, null as unknown as AnimalFormValues),
    ).resolves.toEqual({
      ok: false,
      error: 'Confira os campos e tente de novo.',
      fieldErrors: {},
    });
    expect(bodies).toEqual([]);
  });

  it.each([
    ['500', () => HttpResponse.json({ message: 'erro' }, { status: 500 })],
    ['409 sem mensagem', () => new HttpResponse(null, { status: 409 })],
    ['api fora do ar', () => HttpResponse.error()],
  ])('%s devolve o erro genérico', async (_case, answer) => {
    apiAnswers('post', CREATE_URL, answer);

    await expect(saveAnimal(null, VALUES)).resolves.toEqual({
      ok: false,
      error: 'Não foi possível salvar o animal. Tente de novo.',
      fieldErrors: {},
    });
  });

  it('AUTH-07: 401 → /session/end', async () => {
    apiAnswers('post', CREATE_URL, () =>
      HttpResponse.json({ message: 'x' }, { status: 401 }),
    );

    const error = await saveAnimal(null, VALUES).catch((e: unknown) => e);

    expect(redirectTarget(error)).toBe('/session/end');
  });
});
