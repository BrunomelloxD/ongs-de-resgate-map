import { haversineKm, type LatLng } from '@/lib/geo';
import type { NgoPin, RankedNgo } from '../map.types';

export interface RankOptions {
  /** MAPF-01: keep only the NGOs open now. */
  openNow: boolean;
  /** MAPF-02: keep only the NGOs within this distance of the center. */
  radiusKm: number;
}

/**
 * Distance, order and filters, all in the browser (MAP-07, MAP-19, MAPF-01,
 * MAPF-02): nearest first and, on a tie, the open ones first.
 */
export function rankNgos(
  items: readonly NgoPin[],
  center: LatLng,
  { openNow, radiusKm }: RankOptions,
): RankedNgo[] {
  return items
    .map((ngo) => ({ ...ngo, distanceKm: haversineKm(center, ngo) }))
    .filter((ngo) => ngo.distanceKm <= radiusKm && (!openNow || ngo.openNow))
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm || Number(b.openNow) - Number(a.openNow),
    );
}
