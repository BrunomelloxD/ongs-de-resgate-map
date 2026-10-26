import { z } from 'zod';
import { isValidWhatsapp, normalizeCep, toWhatsappNumber } from './masks';
import { NGO_FIELD_MESSAGES } from './ngo-field-messages';
import { UFS } from './ufs';

// Field rules shared by the signup and the profile: a feature doesn't import another.
const m = NGO_FIELD_MESSAGES;

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Required text, trimmed, up to `max` characters, one message for both rules. */
const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, message);

/** SIGN-06. */
export const legalNameSchema = z
  .string()
  .trim()
  .min(1, m.legalNameRequired)
  .max(150, m.legalNameTooLong);

/** SIGN-07, SIGN-08. */
export const descriptionSchema = z
  .string()
  .min(30, m.descriptionLength)
  .max(600, m.descriptionLength);

/** SIGN-11. */
export const emailSchema = z
  .string()
  .trim()
  .pipe(z.email(m.emailInvalid).max(254, m.emailInvalid));

/** SIGN-13, SIGN-14: leaves as 55 + DDD + number. */
export const whatsappSchema = z
  .string()
  .refine(isValidWhatsapp, m.whatsappInvalid)
  .transform(toWhatsappNumber);

/** The tap on "Confirmar localização" (SIGN-22, PROF-03); `message` when it's missing. */
export const confirmedLocationSchema = (message: string) =>
  z.object(
    {
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      /** ISO date of the tap on "Confirmar localização". */
      confirmedAt: z.string(),
    },
    message,
  );

/** SIGN-17 to SIGN-22. `location` stays null until "Confirmar localização". */
export const addressSchema = z.object({
  cep: z
    .string()
    .transform(normalizeCep)
    .pipe(z.string().length(8, m.cepInvalid)),
  street: requiredText(150, m.street),
  number: requiredText(10, m.number),
  complement: z
    .string()
    .trim()
    .max(60, m.complement)
    .transform((value) => value || null),
  district: requiredText(80, m.district),
  city: requiredText(80, m.city),
  uf: z.enum(UFS, m.uf),
  location: confirmedLocationSchema(m.locationNotConfirmed),
});

const daySchema = z
  .object({
    /** 0 = Sunday. */
    dayOfWeek: z.number().int().min(0).max(6),
    closed: z.boolean(),
    opensAt: z.string().nullable(),
    closesAt: z.string().nullable(),
  })
  .superRefine((day, ctx) => {
    if (day.closed) return;
    if (!HH_MM.test(day.opensAt ?? '') || !HH_MM.test(day.closesAt ?? '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['opensAt'],
        message: m.hoursFormat,
      });
    } else if (day.closesAt! <= day.opensAt!) {
      // SIGN-25: "HH:MM" strings compare in time order.
      ctx.addIssue({
        code: 'custom',
        path: ['closesAt'],
        message: m.closingBeforeOpening,
      });
    }
  })
  .transform((day) =>
    day.closed ? { ...day, opensAt: null, closesAt: null } : day,
  );

/** SIGN-23 to SIGN-25: the 7 days of the week. */
export const hoursSchema = z.object({
  openingHours: z.array(daySchema).length(7),
});
