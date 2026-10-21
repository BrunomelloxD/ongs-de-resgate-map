import 'server-only';
import { getAuthedApi } from '@/lib/session';
import type { MyAnimal, MyNgo } from '../dashboard.types';

/** GET /me/ngo (DASH-07, DEMO-06). A 401 goes to /session/end (AUTH-07). */
export async function getMyNgo(): Promise<MyNgo> {
  const { data, response } = await (await getAuthedApi()).GET('/api/v1/me/ngo');
  if (data) return data;

  throw new Error(`GET /me/ngo failed: ${response.status}`);
}

/** GET /me/animals, all of them: search and filter run on the client (DASH-04, DASH-05). */
export async function getMyAnimals(): Promise<MyAnimal[]> {
  const { data, response } = await (
    await getAuthedApi()
  ).GET('/api/v1/me/animals');
  if (data) return data;

  throw new Error(`GET /me/animals failed: ${response.status}`);
}
