import { mapHref } from './map-href';

describe('mapHref', () => {
  it('põe o centro e o raio de 5 km no fragmento de /mapa', () => {
    expect(mapHref({ lat: -23.5329, lng: -46.6395 })).toBe(
      '/mapa#c=-23.5329,-46.6395&r=5',
    );
  });
});
