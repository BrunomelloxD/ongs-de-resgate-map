import { parseBooleanQuery } from '../list-ngo-animals.dto.js';
import { parseBbox, splitList } from '../search-ngos.dto.js';

describe('parseBbox', () => {
  it('lê minLng,minLat,maxLng,maxLat', () => {
    expect(parseBbox('-46.70,-23.60,-46.60,-23.50')).toEqual({
      minLng: -46.7,
      minLat: -23.6,
      maxLng: -46.6,
      maxLat: -23.5,
    });
  });

  it('aceita números inteiros e os limites do globo', () => {
    expect(parseBbox('-180,-90,180,90')).toEqual({
      minLng: -180,
      minLat: -90,
      maxLng: 180,
      maxLat: 90,
    });
  });

  it.each([
    ['vazio', ''],
    ['3 números', '-46.7,-23.6,-46.6'],
    ['5 números', '-46.7,-23.6,-46.6,-23.5,1'],
    ['texto', 'a,b,c,d'],
    ['número em notação científica', '1e2,-23.6,-46.6,-23.5'],
    ['longitude abaixo de -180', '-181,-23.6,-46.6,-23.5'],
    ['longitude acima de 180', '-46.7,-23.6,181,-23.5'],
    ['latitude abaixo de -90', '-46.7,-91,-46.6,-23.5'],
    ['latitude acima de 90', '-46.7,-23.6,-46.6,91'],
    ['minLng igual a maxLng', '-46.7,-23.6,-46.7,-23.5'],
    ['minLat maior que maxLat', '-46.7,-23.5,-46.6,-23.6'],
  ])('%s → null', (_case, value) => {
    expect(parseBbox(value)).toBeNull();
  });

  it('valor que não é texto (bbox repetida na query) → null', () => {
    expect(parseBbox(['-46.7,-23.6,-46.6,-23.5'])).toBeNull();
    expect(parseBbox(undefined)).toBeNull();
  });
});

describe('splitList', () => {
  it('separa por vírgula e deixa o resto para os validadores', () => {
    expect(splitList('DOG,CAT')).toEqual(['DOG', 'CAT']);
    expect(splitList(['DOG'])).toEqual(['DOG']);
  });
});

describe('parseBooleanQuery', () => {
  it.each([
    ['true', true],
    ['false', false],
    ['sim', 'sim'],
    [true, true],
  ])('%j → %j', (value, expected) => {
    expect(parseBooleanQuery(value)).toBe(expected);
  });
});
