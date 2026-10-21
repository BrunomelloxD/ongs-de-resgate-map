import type { LatLng } from '@/lib/geo';
import type { RadiusKm } from '../map.types';

// Same format as the link the location feature builds; features can't share code.
// The fragment never reaches the server (SEC-01).

export const RADII: readonly RadiusKm[] = [5, 10, 25];
export const DEFAULT_RADIUS_KM: RadiusKm = 5;

export interface MapHash {
  center: LatLng;
  radiusKm: RadiusKm;
}

const NUMBER = /^-?\d+(\.\d+)?$/;

/** `#c={lat},{lng}&r={km}`. */
export function buildMapHash({ lat, lng }: LatLng, radiusKm: RadiusKm): string {
  return `#c=${lat},${lng}&r=${radiusKm}`;
}

/** The center and radius of `#c={lat},{lng}&r={km}`, or `null` without a valid center. */
export function parseMapHash(hash: string): MapHash | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const parts = params.get('c')?.split(',') ?? [];
  if (parts.length !== 2 || !parts.every((part) => NUMBER.test(part))) {
    return null;
  }

  const [lat, lng] = parts.map(Number) as [number, number];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const r = Number(params.get('r'));
  const radiusKm = RADII.find((radius) => radius === r) ?? DEFAULT_RADIUS_KM;

  return { center: { lat, lng }, radiusKm };
}
