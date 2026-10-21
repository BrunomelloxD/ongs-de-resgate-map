'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { getAuthedApi } from '@/lib/session';
import { animalFormDictionary } from '../animal-form.dictionary';
import type { DeleteAnimalError } from '../animal-form.types';
import { DASHBOARD_PATH } from '../paths';

const t = animalFormDictionary.delete;

/**
 * DELETE /me/animals/:id (AFORM-16, AFORM-17): the animal and its photos in the
 * bucket. Success redirects to /painel; any failure keeps the animal.
 */
export async function deleteAnimal(id: string): Promise<DeleteAnimalError> {
  // Public POST endpoint: validate here too.
  if (!z.uuid().safeParse(id).success) return { ok: false, error: t.failed };

  try {
    const api = await getAuthedApi();
    const { response } = await api.DELETE('/api/v1/me/animals/{id}', {
      params: { path: { id } },
    });
    if (response.ok) redirect(DASHBOARD_PATH);
  } catch (caught) {
    // Keeps the redirects: /painel on success, /session/end on a 401 (AUTH-07).
    unstable_rethrow(caught);
  }
  return { ok: false, error: t.failed };
}
