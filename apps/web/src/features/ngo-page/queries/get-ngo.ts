import 'server-only';
import { cache } from 'react';
import { getApi } from '@/lib/api';
import type {
  NgoAnimalFilters,
  NgoAnimalPage,
  NgoPublic,
} from '../ngo-page.types';

/** GET /ngos/:slug (NGO-01). 404 → null (NGO-11). Deduped: the page and its metadata share one call. */
export const getNgo = cache(async (slug: string): Promise<NgoPublic | null> => {
  const { data, response } = await getApi().GET('/api/v1/ngos/{slug}', {
    params: { path: { slug } },
  });
  if (data) return data;
  if (response.status === 404) return null;

  throw new Error(`GET /ngos/${slug} failed: ${response.status}`);
});

/** GET /ngos/:slug/animals, 12 per page (NGO-05 to NGO-10). 404 → null. */
export async function getNgoAnimals(
  slug: string,
  filters: Partial<NgoAnimalFilters>,
  page: number,
): Promise<NgoAnimalPage | null> {
  const { data, response } = await getApi().GET('/api/v1/ngos/{slug}/animals', {
    params: {
      path: { slug },
      // NGO-05: "Só disponíveis" starts on.
      query: { page, ...filters, available: filters.available ?? true },
    },
  });
  if (data) return data;
  if (response.status === 404) return null;

  throw new Error(`GET /ngos/${slug}/animals failed: ${response.status}`);
}
