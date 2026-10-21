import 'server-only';
import { cache } from 'react';
import { getApi } from '@/lib/api';
import type { AnimalPublic } from '../animal-page.types';

/**
 * GET /animals/:id?slug= (ANI-01). Missing, deleted, from another slug or from
 * an inactive NGO → null (ANI-06). Deduped for the page and its metadata.
 */
export const getAnimal = cache(
  async (slug: string, id: string): Promise<AnimalPublic | null> => {
    const { data, response } = await getApi().GET('/api/v1/animals/{id}', {
      params: { path: { id }, query: { slug } },
    });
    if (data) return data;
    if (response.status === 404) return null;

    throw new Error(`GET /animals/${id} failed: ${response.status}`);
  },
);
