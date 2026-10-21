import { z } from 'zod';

/** SIGN-16. */
export const PASSWORDS_DIFFER = 'As senhas não conferem.';

// SPEC_DEVIATION: the spec names the rules, not the field messages; the letter and
// number texts are the api's, the length ones are the simplest.
export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de 8 ou mais caracteres.')
  .max(128, 'A senha pode ter até 128 caracteres.')
  .regex(/\p{L}/u, 'A senha precisa de ao menos uma letra.')
  .regex(/\d/, 'A senha precisa de ao menos um número.');

/** New password + confirmation (reset, signup and profile). The rules shown
 * while typing are in `password-rules.ts`, which ships without zod. */
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmation: z.string() })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: PASSWORDS_DIFFER,
  });
