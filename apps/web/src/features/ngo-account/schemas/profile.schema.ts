import { z } from 'zod';
import {
  addressSchema,
  confirmedLocationSchema,
  descriptionSchema,
  emailSchema,
  hoursSchema,
  legalNameSchema,
  whatsappSchema,
} from '@/lib/ngo-schemas';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type {
  ProfileErrors,
  ProfileField,
  ProfileValues,
} from '../ngo-account.types';

const t = ngoAccountDictionary.profile;

/**
 * The signup rules without the CNPJ and the password (PROF-01, PROF-02). The
 * location must be confirmed again after an address change (PROF-03).
 */
export const profileSchema = z.object({
  legalName: legalNameSchema,
  description: descriptionSchema,
  email: emailSchema,
  whatsapp: whatsappSchema,
  ...addressSchema.shape,
  location: confirmedLocationSchema(t.locationNotConfirmed),
  ...hoursSchema.shape,
});

export type ProfileOutput = z.output<typeof profileSchema>;

/** The first message of each field, and of each day by `dayOfWeek`. */
export function toProfileErrors(
  error: z.ZodError,
  values: Partial<Pick<ProfileValues, 'openingHours'>>,
): ProfileErrors {
  const errors: ProfileErrors = { fields: {}, hours: {} };
  for (const issue of error.issues) {
    const [key, index] = issue.path;
    if (key === 'openingHours') {
      // A malformed week (not 7 days) has no day to point at.
      const day = values.openingHours?.[index as number];
      if (day) errors.hours[day.dayOfWeek] ??= issue.message;
    } else {
      errors.fields[key as ProfileField] ??= issue.message;
    }
  }
  return errors;
}
