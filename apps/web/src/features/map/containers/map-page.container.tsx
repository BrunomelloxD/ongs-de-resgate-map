import { connection } from 'next/server';
import { getEnv } from '@/lib/env';
import { MapPage } from '../map-page.client';

/** Tiles come from the server env, so the provider changes without a rebuild (MAP-01). */
export async function MapPageContainer() {
  // Request time only: the build has no env.
  await connection();
  const { TILE_URL, TILE_ATTRIBUTION } = getEnv();

  return <MapPage tileUrl={TILE_URL} attribution={TILE_ATTRIBUTION} />;
}
