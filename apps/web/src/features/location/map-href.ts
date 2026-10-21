import type { LatLng } from '@/lib/geo';

/** First radius of the map (Assumptions: "Raio de 5 km vs. bbox"). */
export const INITIAL_RADIUS_KM = 5;

/**
 * `/mapa#c={lat},{lng}&r=5`. The center rides in the fragment, which the
 * browser never sends to the server (SEC-01).
 */
export function mapHref({ lat, lng }: LatLng): string {
  return `/mapa#c=${lat},${lng}&r=${INITIAL_RADIUS_KM}`;
}
