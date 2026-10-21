import { buildMapHash, parseMapHash } from './map-hash';

const CENTER = { lat: -23.5869, lng: -46.6347 };

describe('buildMapHash', () => {
  it('grava o centro e o raio no fragmento', () => {
    expect(buildMapHash(CENTER, 10)).toBe('#c=-23.5869,-46.6347&r=10');
  });
});

describe('parseMapHash', () => {
  it.each([5, 10, 25] as const)('ida e volta com raio %i km', (radiusKm) => {
    expect(parseMapHash(buildMapHash(CENTER, radiusKm))).toEqual({
      center: CENTER,
      radiusKm,
    });
  });

  it('lê o link que a localização gera, sem arredondar (LOC-04)', () => {
    expect(parseMapHash('#c=-23.53291,-46.63952&r=5')).toEqual({
      center: { lat: -23.53291, lng: -46.63952 },
      radiusKm: 5,
    });
  });

  it.each([['7'], ['0'], ['abc'], [null]])(
    'raio %j → 5 (só 5, 10 ou 25)',
    (r) => {
      const hash = `#c=-23.5869,-46.6347${r === null ? '' : `&r=${r}`}`;

      expect(parseMapHash(hash)?.radiusKm).toBe(5);
    },
  );

  it.each([
    [''],
    ['#'],
    ['#r=5'],
    ['#c=&r=5'],
    ['#c=-23.5&r=5'],
    ['#c=abc,def&r=5'],
    ['#c=-23.5,-46.6,1&r=5'],
    ['#c=-91,-46.6&r=5'],
    ['#c=-23.5,181&r=5'],
    ['#c=Infinity,-46.6&r=5'],
  ])('hash inválido %j → null', (hash) => {
    expect(parseMapHash(hash)).toBeNull();
  });
});
