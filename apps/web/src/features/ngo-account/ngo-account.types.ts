import type { Schemas } from '@repo/api-client';

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

export type MyNgo = Schemas['NgoMeDto'];

/** The profile form as typed (masked WhatsApp and CEP), flat so field ids match (PROF-01). */
export interface ProfileValues extends AddressFieldsValues {
  legalName: string;
  description: string;
  email: string;
  whatsapp: string;
  openingHours: DayHours[];
}

export type ProfileField = Exclude<keyof ProfileValues, 'openingHours'>;

export interface ProfileErrors {
  fields: Partial<Record<ProfileField, string>>;
  /** Error of a day, by `dayOfWeek`. */
  hours: Partial<Record<number, string>>;
}

/** What `updateProfile` answers (PROF-04). */
export type UpdateProfileResult =
  | { ok: true; message: string }
  | { ok: false; errors: ProfileErrors; error: string | null };

export type ChangePasswordField =
  'currentPassword' | 'password' | 'confirmation';

/** `useActionState` state of the password change (PROF-05, PROF-06). */
export interface ChangePasswordState {
  fieldErrors: Partial<Record<ChangePasswordField, string>>;
  formError?: string;
  /** Set on a 204; a new value each time, so the form clears its fields. */
  success?: { message: string; at: number };
}

/** What `deleteAccount` answers when the account stays (PROF-08). */
export interface DeleteAccountResult {
  error: string;
}
