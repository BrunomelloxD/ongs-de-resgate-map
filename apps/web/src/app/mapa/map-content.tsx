import { connection } from 'next/server';
import { getDemoInfo } from '@/features/demo';
import { MapPageContainer } from '@/features/map';
import { MapPlaceSearch } from './map-place-search.client';

/** Joins the map with the locked demo's starting point (DEP-22). */
export async function MapContent() {
  // Request time only: the build has no api to ask.
  await connection();
  // A failing /demo leaves the map as it is (location error without a center).
  const info = await getDemoInfo().catch(() => null);

  return (
    <MapPageContainer
      PlaceSearch={MapPlaceSearch}
      start={info?.mapStart ?? null}
    />
  );
}
