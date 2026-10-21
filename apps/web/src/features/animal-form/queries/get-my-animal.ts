import 'server-only';
import { getAuthedApi } from '@/lib/session';
import type { MyAnimal } from '../animal-form.types';

/**
 * The NGO's animal to edit, or null (missing, deleted or of another NGO: SEC-06).
 * The api has no GET /me/animals/:id, so it comes from the list. A 401 goes to /session/end.
 */
export async function getMyAnimal(id: string): Promise<MyAnimal | null> {
  const { data, response } = await (
    await getAuthedApi()
  ).GET('/api/v1/me/animals');
  if (!data) throw new Error(`GET /me/animals failed: ${response.status}`);

  return data.find((animal) => animal.id === id) ?? null;
}
