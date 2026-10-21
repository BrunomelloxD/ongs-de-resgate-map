import type { CepAddress, City } from './location.types';

export function makeCity(overrides: Partial<City> = {}): City {
  return {
    id: 3550308,
    name: 'São Paulo',
    uf: 'SP',
    lat: -23.5329,
    lng: -46.6395,
    ...overrides,
  };
}

export function makeCepAddress(
  overrides: Partial<CepAddress> = {},
): CepAddress {
  return {
    street: 'Avenida Paulista',
    district: 'Bela Vista',
    city: 'São Paulo',
    uf: 'SP',
    lat: -23.5613,
    lng: -46.6565,
    ...overrides,
  };
}
