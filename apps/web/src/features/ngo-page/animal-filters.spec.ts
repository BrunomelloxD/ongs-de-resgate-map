import {
  animalFiltersHref,
  DEFAULT_ANIMAL_FILTERS,
  parseAnimalFilters,
} from './animal-filters';

describe('parseAnimalFilters', () => {
  it('NGO-05: sem parâmetros, "Só disponíveis" ligado e página 1', () => {
    expect(parseAnimalFilters({})).toEqual({
      filters: {
        species: undefined,
        sex: undefined,
        size: undefined,
        available: true,
      },
      page: 1,
    });
  });

  it('NGO-06/07/10: lê espécie, sexo, porte, available=false e a página', () => {
    expect(
      parseAnimalFilters({
        species: 'CAT',
        sex: ['FEMALE', 'MALE'],
        size: 'SMALL',
        available: 'false',
        page: '2',
      }),
    ).toEqual({
      filters: {
        species: 'CAT',
        sex: 'FEMALE',
        size: 'SMALL',
        available: false,
      },
      page: 2,
    });
  });

  it('valores desconhecidos são ignorados', () => {
    expect(
      parseAnimalFilters({ species: 'BIRD', available: 'x', page: '-1' }),
    ).toEqual({
      filters: {
        species: undefined,
        sex: undefined,
        size: undefined,
        available: true,
      },
      page: 1,
    });
  });
});

describe('animalFiltersHref', () => {
  it('padrão → só o caminho', () => {
    expect(animalFiltersHref('/ong/patas', DEFAULT_ANIMAL_FILTERS)).toBe(
      '/ong/patas',
    );
  });

  it('filtros e página viram search params', () => {
    expect(
      animalFiltersHref(
        '/ong/patas',
        { species: 'DOG', sex: 'MALE', size: 'LARGE', available: false },
        3,
      ),
    ).toBe('/ong/patas?species=DOG&sex=MALE&size=LARGE&available=false&page=3');
  });
});
