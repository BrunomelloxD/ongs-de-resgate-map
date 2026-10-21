'use server';

import { headers } from 'next/headers';
import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';
import { aboutSchema, contactSchema } from '../schemas/signup.schema';
import { signupDictionary } from '../signup.dictionary';
import type { AvailabilityResult } from '../signup.types';

const t = signupDictionary;

interface Messages {
  invalid: string;
  taken: string;
  unchecked: string;
}

/** Maps the api's answer; 429 (20/min per IP) and failures don't block the step. */
function toResult(
  data: { available: boolean } | undefined,
  status: number,
  messages: Messages,
): AvailabilityResult {
  if (data) {
    return data.available
      ? { status: 'available' }
      : { status: 'taken', error: messages.taken };
  }
  if (status === 400) return { status: 'invalid', error: messages.invalid };
  return { status: 'unchecked', error: messages.unchecked };
}

/** POST /ngos/validations/cnpj (SIGN-04, SIGN-05). Public POST endpoint: validates here too. */
export async function checkCnpj(cnpj: string): Promise<AvailabilityResult> {
  const messages = {
    invalid: t.validation.cnpjInvalid,
    taken: t.availability.cnpjTaken,
    unchecked: t.availability.cnpjUnchecked,
  };
  const parsed = aboutSchema.shape.cnpj.safeParse(String(cnpj));
  if (!parsed.success) return { status: 'invalid', error: messages.invalid };

  const { data, response } = await getApi({
    clientIp: getClientIp(await headers()),
  }).POST('/api/v1/ngos/validations/cnpj', { body: { cnpj: parsed.data } });

  return toResult(data, response.status, messages);
}

/** POST /ngos/validations/email (SIGN-11, SIGN-12). Public POST endpoint: validates here too. */
export async function checkEmail(email: string): Promise<AvailabilityResult> {
  const messages = {
    invalid: t.validation.emailInvalid,
    taken: t.availability.emailTaken,
    unchecked: t.availability.emailUnchecked,
  };
  const parsed = contactSchema.shape.email.safeParse(String(email));
  if (!parsed.success) return { status: 'invalid', error: messages.invalid };

  const { data, response } = await getApi({
    clientIp: getClientIp(await headers()),
  }).POST('/api/v1/ngos/validations/email', { body: { email: parsed.data } });

  return toResult(data, response.status, messages);
}
