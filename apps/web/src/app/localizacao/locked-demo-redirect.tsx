import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getDemoInfo } from '@/features/demo';

/**
 * DEP-21: the locked demo always opens the map at the demo NGO's city, so the
 * place choice is skipped; nothing here asks for the position.
 */
export async function LockedDemoRedirect() {
  // Request time only: the build has no api to ask.
  await connection();
  const info = await getDemoInfo().catch(() => null);
  if (info?.locked) redirect('/mapa');

  return null;
}
