import { Injectable } from '@nestjs/common';
import municipalities from '../data/municipalities.json' with { type: 'json' };

export interface City {
  /** IBGE code. */
  id: number;
  name: string;
  uf: string;
  lat: number;
  lng: number;
}

const MIN_QUERY = 3;
const MAX_RESULTS = 5;

/** Lowercase without diacritics, so "São" matches "sao". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** IBGE municipalities from a static file (tools/geo/build-municipalities.ts). */
@Injectable()
export class CitySearchService {
  private readonly index = (municipalities as City[]).map((city) => ({
    city,
    key: normalize(city.name),
  }));

  /** LOC-07: up to 5 municipalities whose name contains the text. */
  search(q: string): City[] {
    const query = normalize(q.trim());
    if (query.length < MIN_QUERY) {
      return [];
    }
    // Exact names first: "Cruz" would otherwise drown among 59 "...cruz..." names.
    return this.index
      .filter(({ key }) => key.includes(query))
      .sort((a, b) => Number(b.key === query) - Number(a.key === query))
      .slice(0, MAX_RESULTS)
      .map(({ city }) => city);
  }

  /** Municipality center, used when a CEP or address has no coordinates (SIGN-20). */
  findByName(name: string, uf: string): City | null {
    const key = normalize(name.trim());
    const state = uf.toUpperCase();
    return (
      this.index.find((entry) => entry.key === key && entry.city.uf === state)
        ?.city ?? null
    );
  }
}
