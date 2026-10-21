import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateAnimalDto,
  ListMyAnimalsDto,
  SetAvailabilityDto,
  UpdateAnimalDto,
} from '../animal.dto.js';

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const VALID = {
  name: 'Mel',
  species: 'CAT',
  breed: 'SRD (vira-lata)',
  sex: 'FEMALE',
  size: 'SMALL',
  ageValue: 2,
  ageUnit: 'YEARS',
  description: 'Calma e carinhosa.',
  imageIds: [uuid(1)],
};

async function errorsOf<T extends object>(
  cls: new () => T,
  body: object,
): Promise<Record<string, string[]>> {
  const errors = await validate(plainToInstance(cls, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return Object.fromEntries(
    errors.map((error) => [
      error.property,
      Object.values(error.constraints ?? {}),
    ]),
  );
}

describe('CreateAnimalDto', () => {
  it('aceita o animal válido, com raça e descrição opcionais (AFORM-01)', async () => {
    expect(await errorsOf(CreateAnimalDto, VALID)).toEqual({});
    const { breed: _b, description: _d, ...minimal } = VALID;
    expect(await errorsOf(CreateAnimalDto, minimal)).toEqual({});
    expect(
      await errorsOf(CreateAnimalDto, {
        ...VALID,
        breed: null,
        description: null,
      }),
    ).toEqual({});
  });

  it.each([
    ['vazio', ''],
    ['só espaços', '   '],
    ['com 61 caracteres', 'a'.repeat(61)],
  ])('recusa nome %s (AFORM-02)', async (_case, name) => {
    expect(await errorsOf(CreateAnimalDto, { ...VALID, name })).toHaveProperty(
      'name',
    );
  });

  it('aceita nome com 60 caracteres (AFORM-02)', async () => {
    expect(
      await errorsOf(CreateAnimalDto, { ...VALID, name: 'a'.repeat(60) }),
    ).toEqual({});
  });

  it.each([
    [-1, false],
    [0, true],
    [30, true],
    [31, false],
    [2.5, false],
  ])('idade %s → válida: %s (AFORM-03)', async (ageValue, valid) => {
    const errors = await errorsOf(CreateAnimalDto, { ...VALID, ageValue });
    expect('ageValue' in errors).toBe(!valid);
  });

  it('recusa descrição com 1001 caracteres e aceita 1000 (AFORM-04)', async () => {
    expect(
      await errorsOf(CreateAnimalDto, {
        ...VALID,
        description: 'a'.repeat(1001),
      }),
    ).toHaveProperty('description');
    expect(
      await errorsOf(CreateAnimalDto, {
        ...VALID,
        description: 'a'.repeat(1000),
      }),
    ).toEqual({});
  });

  it('sem fotos → "Adicione pelo menos 1 foto." (AFORM-05)', async () => {
    expect(await errorsOf(CreateAnimalDto, { ...VALID, imageIds: [] })).toEqual(
      { imageIds: ['Adicione pelo menos 1 foto.'] },
    );
  });

  it('aceita 8 fotos e recusa 9 (AFORM-07, demo desligada)', async () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => uuid(i));
    expect(
      await errorsOf(CreateAnimalDto, { ...VALID, imageIds: ids(8) }),
    ).toEqual({});
    expect(
      await errorsOf(CreateAnimalDto, { ...VALID, imageIds: ids(9) }),
    ).toHaveProperty('imageIds');
  });

  it('recusa foto repetida e id que não é UUID', async () => {
    expect(
      await errorsOf(CreateAnimalDto, {
        ...VALID,
        imageIds: [uuid(1), uuid(1)],
      }),
    ).toHaveProperty('imageIds');
    expect(
      await errorsOf(CreateAnimalDto, { ...VALID, imageIds: ['abc'] }),
    ).toHaveProperty('imageIds');
  });

  it('recusa espécie, sexo, porte e unidade fora das listas', async () => {
    const errors = await errorsOf(CreateAnimalDto, {
      ...VALID,
      species: 'BIRD',
      sex: 'X',
      size: 'XL',
      ageUnit: 'DAYS',
    });
    expect(Object.keys(errors).sort()).toEqual([
      'ageUnit',
      'sex',
      'size',
      'species',
    ]);
  });

  it('recusa ngoId no corpo: a ONG vem só da sessão (SEC-05)', async () => {
    expect(
      await errorsOf(CreateAnimalDto, { ...VALID, ngoId: uuid(9) }),
    ).toHaveProperty('ngoId');
  });
});

describe('UpdateAnimalDto', () => {
  it('aceita só parte dos campos, com as mesmas regras', async () => {
    expect(await errorsOf(UpdateAnimalDto, { ageValue: 3 })).toEqual({});
    expect(await errorsOf(UpdateAnimalDto, { ageValue: 31 })).toHaveProperty(
      'ageValue',
    );
    expect(await errorsOf(UpdateAnimalDto, { imageIds: [] })).toEqual({
      imageIds: ['Adicione pelo menos 1 foto.'],
    });
  });
});

describe('SetAvailabilityDto', () => {
  it('exige um booleano (DASH-02)', async () => {
    expect(await errorsOf(SetAvailabilityDto, { available: false })).toEqual(
      {},
    );
    expect(
      await errorsOf(SetAvailabilityDto, { available: 'sim' }),
    ).toHaveProperty('available');
  });
});

describe('ListMyAnimalsDto', () => {
  it('filtro padrão "all" e só os 5 filtros do DASH-05', async () => {
    expect(plainToInstance(ListMyAnimalsDto, {}).filter).toBe('all');
    for (const filter of ['all', 'dogs', 'cats', 'available', 'unavailable']) {
      expect(await errorsOf(ListMyAnimalsDto, { filter })).toEqual({});
    }
    expect(
      await errorsOf(ListMyAnimalsDto, { filter: 'birds' }),
    ).toHaveProperty('filter');
  });

  it('busca com até 100 caracteres (DASH-04)', async () => {
    expect(
      await errorsOf(ListMyAnimalsDto, { search: 'a'.repeat(100) }),
    ).toEqual({});
    expect(
      await errorsOf(ListMyAnimalsDto, { search: 'a'.repeat(101) }),
    ).toHaveProperty('search');
  });
});
