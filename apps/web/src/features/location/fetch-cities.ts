import type { City } from './location.types';

/** Browser call to the `/geo/cities` BFF (LOC-07). Rejects on a non-2xx answer. */
export async function fetchCities(
  q: string,
  signal: AbortSignal,
): Promise<City[]> {
  const url = new URL('/geo/cities', window.location.origin);
  url.searchParams.set('q', q);

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`GET /geo/cities: ${response.status}`);

  return response.json();
}
