import type { Bbox } from '@/lib/geo';
import type { MapSpecies, NgoSearchResponse } from '../map.types';

export interface NgoSearchQuery {
  /** Already rounded outward to 2 decimals (SEC-01). */
  bbox: Bbox;
  species: readonly MapSpecies[];
}

export type SearchNgos = (
  query: NgoSearchQuery,
  signal: AbortSignal,
) => Promise<NgoSearchResponse>;

/** Browser call to the `/map/ngos` BFF: only the bbox and the species (SEC-01). */
export const fetchNgos: SearchNgos = async ({ bbox, species }, signal) => {
  const url = new URL('/map/ngos', window.location.origin);
  url.searchParams.set('bbox', bbox.join(','));
  if (species.length > 0) url.searchParams.set('species', species.join(','));

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`GET /map/ngos: ${response.status}`);

  return response.json();
};
