/** What `uploadNgoImage` answers: the new image, or the message to show. */
export type UploadNgoImageResult =
  { ok: true; imageUrl: string | null } | { ok: false; error: string };

/** Set when the NGO taps "Confirmar localização" (SIGN-21, SIGN-22, PROF-03). */
export interface ConfirmedLocation {
  lat: number;
  lng: number;
  /** ISO date of the confirmation. */
  confirmedAt: string;
}

/** The address as typed (masked CEP), shared by the signup and the profile. */
export interface AddressFieldsValues {
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  uf: string;
  location: ConfirmedLocation | null;
}

export type AddressField = keyof AddressFieldsValues;

/** Same shape as the `lookupCep` answer of `features/location` (SIGN-17, SIGN-18). */
export type CepLookupResult =
  | {
      ok: true;
      address: {
        street: string;
        district: string;
        city: string;
        uf: string;
        lat: number | null;
        lng: number | null;
      };
    }
  | { ok: false; error: string };

/** Same shape as the `geocodeAddress` input of `features/location`. */
export interface GeocodeAddressInput {
  street: string;
  number: string;
  district: string;
  city: string;
  uf: string;
}

/** Same shape as the `geocodeAddress` answer: with `found: false`, the city center (SIGN-20). */
export interface GeocodeAddressResult {
  found: boolean;
  lat: number | null;
  lng: number | null;
}

/** One day of the week (SIGN-23). */
export interface DayHours {
  /** 0 = Sunday. */
  dayOfWeek: number;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}
