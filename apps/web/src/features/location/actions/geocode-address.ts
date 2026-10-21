'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';
import type { GeocodeInput, GeocodeResult } from '../location.types';

// Same limits as the api's profile fields; the api takes up to 300 characters.
const inputSchema = z.object({
  street: z.string().trim().min(1).max(150),
  number: z.string().trim().min(1).max(10),
  district: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  uf: z.string().trim().length(2),
});

const NOWHERE: GeocodeResult = { found: false, lat: null, lng: null };

/** Case and accent insensitive, like the api's city search (LOC-07). */
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * POST /geo/geocode (SIGN-19, SIGN-20). Public POST endpoint: validates here too.
 * Shared by the signup and the profile through `client.ts`.
 */
export async function geocodeAddress(
  address: GeocodeInput,
): Promise<GeocodeResult> {
  const parsed = inputSchema.safeParse(address);
  if (!parsed.success) return NOWHERE;

  const { street, number, district, city, uf } = parsed.data;
  const api = getApi({ clientIp: getClientIp(await headers()) });
  const { data } = await api.POST('/api/v1/geo/geocode', {
    body: { address: `${street}, ${number}, ${district}, ${city} - ${uf}` },
  });
  if (data?.found) return data;

  // SPEC_DEVIATION: the api answers found: false without a coordinate; the
  // city center comes from the IBGE municipality of /geo/cities.
  // Reason: SIGN-20 centers the map on the city.
  const { data: cities = [] } = await api.GET('/api/v1/geo/cities', {
    params: { query: { q: city } },
  });
  const match = cities.find(
    (c) => c.uf === uf.toUpperCase() && fold(c.name) === fold(city),
  );

  return match ? { found: false, lat: match.lat, lng: match.lng } : NOWHERE;
}
