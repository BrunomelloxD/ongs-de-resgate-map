import type { AnimalFormValues } from '../animal-form.types';
import { DEFAULT_BREED, validateAnimal } from './animal.schema';

const PHOTO = '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b';

const VALID: AnimalFormValues = {
  name: 'Mel',
  species: 'CAT',
  sex: 'FEMALE',
  size: 'SMALL',
  ageValue: '2',
  ageUnit: 'YEARS',
  breed: DEFAULT_BREED,
  description: '',
  imageIds: [PHOTO],
};

const errorsOf = (values: Partial<AnimalFormValues>) => {
  const result = validateAnimal({ ...VALID, ...values });
  return result.ok ? {} : result.errors;
};

describe('validateAnimal', () => {
  it('AFORM-01: dados válidos saem no formato da api (idade em número, vazio vira null)', () => {
    expect(validateAnimal(VALID)).toEqual({
      ok: true,
      data: {
        name: 'Mel',
        species: 'CAT',
        sex: 'FEMALE',
        size: 'SMALL',
        ageValue: 2,
        ageUnit: 'YEARS',
        breed: 'SRD (vira-lata)',
        description: null,
        imageIds: [PHOTO],
      },
    });
  });

  it.each([
    ['vazio', ''],
    ['só espaços', '   '],
    ['61 caracteres', 'a'.repeat(61)],
  ])('AFORM-02: nome %s bloqueia com erro no campo', (_case, name) => {
    expect(errorsOf({ name })).toEqual({
      name: 'Informe o nome, com até 60 caracteres.',
    });
  });

  it('AFORM-02: nome com 1 e com 60 caracteres passa', () => {
    expect(errorsOf({ name: 'a' })).toEqual({});
    expect(errorsOf({ name: 'a'.repeat(60) })).toEqual({});
  });

  it.each(['-1', '31', '', '2,5', 'dois'])(
    'AFORM-03: idade "%s" bloqueia com erro no campo',
    (ageValue) => {
      expect(errorsOf({ ageValue })).toEqual({
        ageValue: 'Informe a idade, um número de 0 a 30.',
      });
    },
  );

  it('AFORM-03: idade 0 e 30 passam', () => {
    expect(validateAnimal({ ...VALID, ageValue: '0' })).toMatchObject({
      ok: true,
      data: { ageValue: 0 },
    });
    expect(validateAnimal({ ...VALID, ageValue: '30' })).toMatchObject({
      ok: true,
      data: { ageValue: 30 },
    });
  });

  it('AFORM-04: descrição com 1001 caracteres bloqueia; com 1000 passa', () => {
    expect(errorsOf({ description: 'a'.repeat(1001) })).toEqual({
      description: 'A descrição pode ter até 1000 caracteres.',
    });
    expect(errorsOf({ description: 'a'.repeat(1000) })).toEqual({});
  });

  it('AFORM-05: zero fotos bloqueia com "Adicione pelo menos 1 foto."', () => {
    expect(errorsOf({ imageIds: [] })).toEqual({
      photos: 'Adicione pelo menos 1 foto.',
    });
  });

  it('AFORM-06: raça é opcional (vazia vira null) e vem com "SRD (vira-lata)"', () => {
    expect(DEFAULT_BREED).toBe('SRD (vira-lata)');
    expect(validateAnimal({ ...VALID, breed: '  ' })).toMatchObject({
      ok: true,
      data: { breed: null },
    });
    expect(errorsOf({ breed: 'a'.repeat(61) })).toEqual({
      breed: 'A raça pode ter até 60 caracteres.',
    });
  });

  it('AFORM-01: espécie, sexo, porte e unidade da idade são obrigatórios', () => {
    expect(errorsOf({ species: '', sex: '', size: '', ageUnit: '' })).toEqual({
      species: 'Escolha a espécie.',
      sex: 'Escolha o sexo.',
      size: 'Escolha o porte.',
      ageUnit: 'Escolha meses ou anos.',
    });
  });

  it('entrada que não é um objeto (POST forjado na action) é recusada', () => {
    expect(validateAnimal(null as unknown as AnimalFormValues)).toEqual({
      ok: false,
      errors: {},
    });
  });
});
