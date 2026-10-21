// Isomorphic: the server reads the filters, the browser writes them.
import { parsePageParam } from '@/lib/search-params';
import type { NgoAnimalFilters, Sex, Size, Species } from './ngo-page.types';

type SearchParams = Record<string, string | string[] | undefined>;

export const SPECIES: readonly Species[] = ['DOG', 'CAT', 'OTHER'];
export const SEXES: readonly Sex[] = ['MALE', 'FEMALE'];
export const SIZES: readonly Size[] = ['SMALL', 'MEDIUM', 'LARGE'];

/** NGO-05: "Só disponíveis" on, nothing else chosen. */
export const DEFAULT_ANIMAL_FILTERS: NgoAnimalFilters = { available: true };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(
  options: readonly T[],
  value: string | undefined,
): T | undefined {
  return options.find((option) => option === value);
}

/** Unknown values are ignored, so a hand-edited URL never breaks the page. */
export function parseAnimalFilters(params: SearchParams): {
  filters: NgoAnimalFilters;
  page: number;
} {
  return {
    filters: {
      species: pick(SPECIES, first(params['species'])),
      sex: pick(SEXES, first(params['sex'])),
      size: pick(SIZES, first(params['size'])),
      available: first(params['available']) !== 'false',
    },
    page: parsePageParam(params['page']),
  };
}

/** `?species=CAT&available=false&page=2`; defaults stay out of the URL. */
export function animalFiltersHref(
  pathname: string,
  filters: NgoAnimalFilters,
  page = 1,
): string {
  const query = new URLSearchParams();
  if (filters.species) query.set('species', filters.species);
  if (filters.sex) query.set('sex', filters.sex);
  if (filters.size) query.set('size', filters.size);
  if (!filters.available) query.set('available', 'false');
  if (page > 1) query.set('page', String(page));

  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}
