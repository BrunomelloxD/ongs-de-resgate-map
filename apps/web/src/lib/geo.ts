// Isomorphic: runs on the server and in the browser. No server-only imports.

export interface LatLng {
  lat: number;
  lng: number;
}

/** [minLng, minLat, maxLng, maxLat], the order the api expects. */
export type Bbox = [number, number, number, number];

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in km (MAP-19). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** The smallest bbox that contains the circle of `km` around `center` (MAP-01). */
export function bboxForRadius(center: LatLng, km: number): Bbox {
  const angular = km / EARTH_RADIUS_KM;
  const dLat = toDeg(angular);
  // Exact longitude extent of a circle; grows with latitude. Clamped near the poles.
  const ratio = Math.min(1, Math.sin(angular) / Math.cos(toRad(center.lat)));
  const dLng = toDeg(Math.asin(ratio));

  return [
    center.lng - dLng,
    center.lat - dLat,
    center.lng + dLng,
    center.lat + dLat,
  ];
}

// toFixed first: 0.29 * 100 is 28.999999999999996, which would floor to 28.
const scaled = (value: number) => Number((value * 100).toFixed(6));

/**
 * Rounds to 2 decimals (~1 km), always outward: minimums down, maximums up,
 * so the area never shrinks (SEC-01).
 */
export function roundBboxOutward([minLng, minLat, maxLng, maxLat]: Bbox): Bbox {
  return [
    Math.floor(scaled(minLng)) / 100,
    Math.floor(scaled(minLat)) / 100,
    Math.ceil(scaled(maxLng)) / 100,
    Math.ceil(scaled(maxLat)) / 100,
  ];
}
