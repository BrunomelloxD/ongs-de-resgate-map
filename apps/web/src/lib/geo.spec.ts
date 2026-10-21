import {
  bboxForRadius,
  haversineKm,
  roundBboxOutward,
  type LatLng,
} from './geo';

const SE: LatLng = { lat: -23.5505, lng: -46.6333 };
const PAULISTA: LatLng = { lat: -23.5614, lng: -46.6565 };

describe('haversineKm', () => {
  it('Sé → Paulista fica em ~2,6 km (±0,1)', () => {
    expect(haversineKm(SE, PAULISTA)).toBeGreaterThan(2.5);
    expect(haversineKm(SE, PAULISTA)).toBeLessThan(2.7);
  });

  it('é simétrica e zero para o mesmo ponto', () => {
    expect(haversineKm(SE, SE)).toBe(0);
    expect(haversineKm(PAULISTA, SE)).toBeCloseTo(haversineKm(SE, PAULISTA), 9);
  });

  it('1 grau de latitude no equador vale ~111,19 km', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(
      111.19,
      1,
    );
  });
});

/** Point `km` away from `from` at `bearing` degrees (independent of the code under test). */
function destination(from: LatLng, km: number, bearing: number): LatLng {
  const d = km / 6371;
  const brng = (bearing * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lng1 = (from.lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

describe('bboxForRadius', () => {
  it.each([
    [SE, 5],
    [SE, 25],
    [{ lat: 0, lng: 0 }, 10],
    [{ lat: -60, lng: -46 }, 25],
    [{ lat: 5, lng: -60 }, 5],
  ])('a bbox de %j com %i km contém o círculo', (center, km) => {
    const [minLng, minLat, maxLng, maxLat] = bboxForRadius(center, km);

    for (let bearing = 0; bearing < 360; bearing += 5) {
      const p = destination(center, km, bearing);
      expect(p.lng).toBeGreaterThanOrEqual(minLng - 1e-9);
      expect(p.lng).toBeLessThanOrEqual(maxLng + 1e-9);
      expect(p.lat).toBeGreaterThanOrEqual(minLat - 1e-9);
      expect(p.lat).toBeLessThanOrEqual(maxLat + 1e-9);
    }
  });

  it('é justa: a bbox de 5 km tem ~10 km de altura', () => {
    const [, minLat, , maxLat] = bboxForRadius(SE, 5);

    expect(((maxLat - minLat) * Math.PI * 6371) / 180).toBeCloseTo(10, 1);
  });

  it('fica centrada no ponto', () => {
    const [minLng, minLat, maxLng, maxLat] = bboxForRadius(SE, 5);

    expect((minLng + maxLng) / 2).toBeCloseTo(SE.lng, 9);
    expect((minLat + maxLat) / 2).toBeCloseTo(SE.lat, 9);
  });

  it('perto do polo a longitude se abre sem passar de 180 graus', () => {
    const [minLng, , maxLng] = bboxForRadius({ lat: 89.99, lng: 0 }, 25);

    expect(maxLng - minLng).toBeCloseTo(180, 5);
  });
});

describe('roundBboxOutward', () => {
  it('arredonda para 2 casas, sempre para fora', () => {
    expect(roundBboxOutward([-46.6345, -23.5612, -46.6201, -23.5488])).toEqual([
      -46.64, -23.57, -46.62, -23.54,
    ]);
  });

  it('arredonda para fora também nos positivos', () => {
    expect(roundBboxOutward([10.123, 20.456, 11.781, 21.239])).toEqual([
      10.12, 20.45, 11.79, 21.24,
    ]);
  });

  it.each([
    [0.29, 0.29],
    [1.1, 1.1],
    [-46.64, -46.64],
  ])('valor já com 2 casas (%f) não se move', (value, expected) => {
    expect(roundBboxOutward([value, value, value, value])).toEqual([
      expected,
      expected,
      expected,
      expected,
    ]);
  });
});
