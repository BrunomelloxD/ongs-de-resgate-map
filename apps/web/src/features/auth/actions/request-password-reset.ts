'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';
import { formText } from '@/lib/form-data';
import { authDictionary } from '../auth.dictionary';
import type { ForgotPasswordState } from '../auth.types';

const t = authDictionary;

const emailSchema = z.email().max(254);

/** POST /auth/password-resets (AUTH-08, AUTH-11). The 202 never tells whether the account exists. */
export async function requestPasswordReset(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formText(formData, 'email').trim();
  if (!emailSchema.safeParse(email).success) {
    return { email, fieldError: t.fields.emailInvalid };
  }

  const { response } = await getApi({
    clientIp: getClientIp(await headers()),
  }).POST('/api/v1/auth/password-resets', { body: { email } });

  if (response.status === 202) return { email, sentMessage: t.forgot.sent };
  return {
    email,
    formError:
      response.status === 429 ? t.forgot.tooMany : t.forgot.unavailable,
  };
}
