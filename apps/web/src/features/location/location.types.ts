import type { Schemas } from '@repo/api-client';

/** IBGE municipality (LOC-07). */
export type City = Schemas['CityResponseDto'];

export type CepAddress = Schemas['CepAddressResponseDto'];

/** What `lookupCep` answers: the address, or the message to show on the field. */
export type LookupCepResult =
  { ok: true; address: CepAddress } | { ok: false; error: string };

/** Address parts sent to `geocodeAddress` (SIGN-19). */
export interface GeocodeInput {
  street: string;
  number: string;
  district: string;
  city: string;
  uf: string;
}

/**
 * What `geocodeAddress` answers. With `found: false` the coordinate is the city
 * center (SIGN-20), or null when the city isn't found either.
 */
export type GeocodeResult = Schemas['GeocodeResponseDto'];
