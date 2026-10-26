import { connection } from 'next/server';
import { preconnect } from 'react-dom';
import { getEnv } from '@/lib/env';
import { tileOrigin } from '../lib/tile-origin';
import { MapPage } from '../map-page.client';
import type { PlaceSearch } from '../map.types';

/** Tiles come from the server env, so the provider changes without a rebuild (MAP-01). */
export async function MapPageContainer({
  PlaceSearch,
}: {
  /** "Cidade ou CEP" of the location feature: a feature doesn't import another. */
  PlaceSearch: PlaceSearch;
}) {
  // Request time only: the build has no env.
  await connection();
  const { TILE_URL, TILE_ATTRIBUTION } = getEnv();
  // PERF-04 (T176): the tiles are asked for only after the Leaflet chunk; open the connection now.
  preconnect(tileOrigin(TILE_URL));

  return (
    <MapPage
      tileUrl={TILE_URL}
      attribution={TILE_ATTRIBUTION}
      PlaceSearch={PlaceSearch}
    />
  );
}
