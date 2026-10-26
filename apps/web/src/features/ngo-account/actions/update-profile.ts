'use server';

import { refresh } from 'next/cache';
import { getAuthedApi } from '@/lib/session';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type {
  ProfileErrors,
  ProfileField,
  ProfileValues,
  UpdateProfileResult,
} from '../ngo-account.types';
import { profileSchema, toProfileErrors } from '../schemas/profile.schema';

const t = ngoAccountDictionary.profile;

const FIELDS: readonly ProfileField[] = [
  'legalName',
  'description',
  'email',
  'whatsapp',
  'cep',
  'street',
  'number',
  'complement',
  'district',
  'city',
  'uf',
  'location',
];

/** Fields named by a 400 of the api: class-validator starts each message with the property. */
function rejectedFields(message: unknown): ProfileErrors {
  const errors: ProfileErrors = { fields: {}, hours: {} };
  const messages = Array.isArray(message) ? message : [message];
  for (const text of messages) {
    if (text === t.locationNotConfirmed) {
      errors.fields.location = t.locationNotConfirmed;
      continue;
    }
    const property = String(text).split(' ')[0];
    const field = FIELDS.find((name) => name === property);
    if (field) errors.fields[field] = t.fieldRejected;
  }
  return errors;
}

/**
 * PATCH /me/ngo (PROF-02 to PROF-04). Public POST endpoint: validates with the
 * signup rules again. The CNPJ never leaves: the schema drops unknown keys.
 */
export async function updateProfile(
  values: ProfileValues,
): Promise<UpdateProfileResult> {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      errors: toProfileErrors(parsed.error, values),
      error: t.invalid,
    };
  }

  const { location, ...fields } = parsed.data;
  const api = await getAuthedApi();
  const { data, error, response } = await api.PATCH('/api/v1/me/ngo', {
    body: {
      ...fields,
      lat: location.lat,
      lng: location.lng,
      locationConfirmedAt: location.confirmedAt,
    },
  });

  if (data) {
    refresh();
    return { ok: true, message: t.saved };
  }

  // An empty error body comes as '' or undefined; Object() turns both into an object.
  const body: { message?: unknown } = Object(error);
  if (response.status === 400) {
    return {
      ok: false,
      errors: rejectedFields(body.message),
      error: t.invalid,
    };
  }
  if (response.status === 409) {
    return {
      ok: false,
      errors: { fields: { email: t.emailTaken }, hours: {} },
      error: t.invalid,
    };
  }
  return { ok: false, errors: { fields: {}, hours: {} }, error: t.unavailable };
}
