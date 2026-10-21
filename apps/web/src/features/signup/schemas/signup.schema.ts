import { z } from 'zod';
import {
  isValidCnpj,
  isValidWhatsapp,
  normalizeCep,
  normalizeCnpj,
  toWhatsappNumber,
} from '@/lib/masks';
import { PASSWORDS_DIFFER, passwordSchema } from '@/lib/password';
import { UFS } from '@/lib/ufs';
import { signupDictionary } from '../signup.dictionary';

const t = signupDictionary.validation;

export { UFS };

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Required text, trimmed, up to `max` characters, one message for both rules. */
const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, message);

/** Step 1, "Sobre a ONG" (SIGN-03 to SIGN-08). The CNPJ leaves normalized, as the api takes it. */
export const aboutSchema = z.object({
  cnpj: z.string().transform(normalizeCnpj).refine(isValidCnpj, t.cnpjInvalid),
  legalName: z
    .string()
    .trim()
    .min(1, t.legalNameRequired)
    .max(150, t.legalNameTooLong),
  description: z
    .string()
    .min(30, t.descriptionLength)
    .max(600, t.descriptionLength),
});

/** Step 2, "Contato e acesso" (SIGN-11 to SIGN-16). The WhatsApp leaves as 55 + DDD + number. */
export const contactSchema = z
  .object({
    email: z
      .string()
      .trim()
      .pipe(z.email(t.emailInvalid).max(254, t.emailInvalid)),
    whatsapp: z
      .string()
      .refine(isValidWhatsapp, t.whatsappInvalid)
      .transform(toWhatsappNumber),
    password: passwordSchema,
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: PASSWORDS_DIFFER,
  });

/** Step 3, "Endereço" (SIGN-17 to SIGN-22). `location` stays null until "Confirmar localização". */
export const addressSchema = z.object({
  cep: z
    .string()
    .transform(normalizeCep)
    .pipe(z.string().length(8, t.cepInvalid)),
  street: requiredText(150, t.street),
  number: requiredText(10, t.number),
  complement: z
    .string()
    .trim()
    .max(60, t.complement)
    .transform((value) => value || null),
  district: requiredText(80, t.district),
  city: requiredText(80, t.city),
  uf: z.enum(UFS, t.uf),
  location: z.object(
    {
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      /** ISO date of the tap on "Confirmar localização". */
      confirmedAt: z.string(),
    },
    t.locationNotConfirmed,
  ),
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
        message: t.hoursFormat,
      });
    } else if (day.closesAt! <= day.opensAt!) {
      // SIGN-25: "HH:MM" strings compare in time order.
      ctx.addIssue({
        code: 'custom',
        path: ['closesAt'],
        message: t.closingBeforeOpening,
      });
    }
  })
  .transform((day) =>
    day.closed ? { ...day, opensAt: null, closesAt: null } : day,
  );

/** Step 4, "Horário" (SIGN-23 to SIGN-25): the 7 days of the week. */
export const hoursSchema = z.object({
  openingHours: z.array(daySchema).length(7),
});

/** Step 5, "Revisão" (SIGN-27, DEMO-03, DEMO-20): the demo acceptance only with the demo on. */
export function makeReviewSchema({ demoMode }: { demoMode: boolean }) {
  return z.object({
    termsAccepted: z.literal(true, t.termsRequired),
    demoAccepted: demoMode ? z.literal(true, t.demoRequired) : z.boolean(),
  });
}

export type AboutInput = z.input<typeof aboutSchema>;
export type ContactInput = z.input<typeof contactSchema>;
export type AddressInput = z.input<typeof addressSchema>;
export type HoursInput = z.input<typeof hoursSchema>;
export type ReviewInput = z.input<ReturnType<typeof makeReviewSchema>>;
