import { z } from 'zod';
import { isValidCnpj, normalizeCnpj } from '@/lib/masks';
import {
  addressSchema,
  descriptionSchema,
  emailSchema,
  hoursSchema,
  legalNameSchema,
  whatsappSchema,
} from '@/lib/ngo-schemas';
import { PASSWORDS_DIFFER, passwordSchema } from '@/lib/password';
import { UFS } from '@/lib/ufs';
import { signupDictionary } from '../signup.dictionary';

const t = signupDictionary.validation;

export { UFS };

/** Step 1, "Sobre a ONG" (SIGN-03 to SIGN-08). The CNPJ leaves normalized, as the api takes it. */
export const aboutSchema = z.object({
  cnpj: z.string().transform(normalizeCnpj).refine(isValidCnpj, t.cnpjInvalid),
  legalName: legalNameSchema,
  description: descriptionSchema,
});

/** Step 2, "Contato e acesso" (SIGN-11 to SIGN-16). The WhatsApp leaves as 55 + DDD + number. */
export const contactSchema = z
  .object({
    email: emailSchema,
    whatsapp: whatsappSchema,
    password: passwordSchema,
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: PASSWORDS_DIFFER,
  });

/** Step 3, "Endereço" (SIGN-17 to SIGN-22). `location` stays null until "Confirmar localização". */
export { addressSchema };

/** Step 4, "Horário" (SIGN-23 to SIGN-25): the 7 days of the week. */
export { hoursSchema };

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
