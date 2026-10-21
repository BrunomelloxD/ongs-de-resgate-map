import { makeNgoPin } from '../test-fixtures';
import { rankNgos } from './rank';

const CENTER = { lat: -23.55, lng: -46.63 };
// One degree of latitude is ~111.19 km on the sphere haversine uses.
const KM_PER_DEG_LAT = (6371 * Math.PI) / 180;
const north = (km: number) => CENTER.lat + km / KM_PER_DEG_LAT;

const ALL = { openNow: false, radiusKm: 25 } as const;

describe('rankNgos', () => {
  it('calcula a distância de cada ONG até o centro (MAP-19)', () => {
    const [ranked] = rankNgos(
      [makeNgoPin({ lat: north(2), lng: CENTER.lng })],
      CENTER,
      ALL,
    );

    expect(ranked!.distanceKm).toBeCloseTo(2, 6);
  });

  it('ordena por distância crescente (MAP-07)', () => {
    const ranked = rankNgos(
      [
        makeNgoPin({ id: 'far', lat: north(3), lng: CENTER.lng }),
        makeNgoPin({ id: 'near', lat: north(1), lng: CENTER.lng }),
        makeNgoPin({ id: 'mid', lat: north(2), lng: CENTER.lng }),
      ],
      CENTER,
      ALL,
    );

    expect(ranked.map((ngo) => ngo.id)).toEqual(['near', 'mid', 'far']);
  });

  it('empate de distância → a aberta vem primeiro (MAP-07)', () => {
    const ranked = rankNgos(
      [
        makeNgoPin({ id: 'closed', openNow: false, lat: north(1) }),
        makeNgoPin({ id: 'open', openNow: true, lat: north(1) }),
      ].map((ngo) => ({ ...ngo, lng: CENTER.lng })),
      CENTER,
      ALL,
    );

    expect(ranked.map((ngo) => ngo.id)).toEqual(['open', 'closed']);
  });

  it('ONG a 6 km fica fora do raio de 5 km e entra no de 10 km (MAPF-02)', () => {
    const items = [
      makeNgoPin({ id: 'in', lat: north(4.9), lng: CENTER.lng }),
      makeNgoPin({ id: 'out', lat: north(6), lng: CENTER.lng }),
    ];

    expect(
      rankNgos(items, CENTER, { openNow: false, radiusKm: 5 }).map(
        (ngo) => ngo.id,
      ),
    ).toEqual(['in']);
    expect(
      rankNgos(items, CENTER, { openNow: false, radiusKm: 10 }).map(
        (ngo) => ngo.id,
      ),
    ).toEqual(['in', 'out']);
  });

  it('"Aberta agora" remove as fechadas (MAPF-01)', () => {
    const items = [
      makeNgoPin({ id: 'open', openNow: true, lat: north(2) }),
      makeNgoPin({ id: 'closed', openNow: false, lat: north(1) }),
    ].map((ngo) => ({ ...ngo, lng: CENTER.lng }));

    expect(
      rankNgos(items, CENTER, { openNow: true, radiusKm: 5 }).map(
        (ngo) => ngo.id,
      ),
    ).toEqual(['open']);
    expect(
      rankNgos(items, CENTER, { openNow: false, radiusKm: 5 }).map(
        (ngo) => ngo.id,
      ),
    ).toEqual(['closed', 'open']);
  });
});
