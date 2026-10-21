'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';
import { formText } from '@/lib/form-data';
import { setSessionCookie } from '@/lib/session';
import { authDictionary } from '../auth.dictionary';
import type { LoginState } from '../auth.types';

const t = authDictionary;

// Same limits as the api's LoginDto; no password rules: the login only compares.
const loginSchema = z.object({
  email: z
    .email({ error: t.fields.emailInvalid })
    .max(254, t.fields.emailInvalid),
  password: z
    .string()
    .min(1, t.fields.passwordRequired)
    .max(128, t.login.invalid),
});

/** POST /auth/sessions (AUTH-02 to AUTH-04). Public POST endpoint: validates here too. */
export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formText(formData, 'email').trim();
  const parsed = loginSchema.safeParse({
    email,
    password: formText(formData, 'password'),
  });
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors;
    return {
      email,
      fieldErrors: { email: errors.email?.[0], password: errors.password?.[0] },
    };
  }

  const { data, response } = await getApi({
    clientIp: getClientIp(await headers()),
  }).POST('/api/v1/auth/sessions', { body: parsed.data });

  if (data) {
    await setSessionCookie(data.token);
    redirect('/painel');
  }

  const formError =
    response.status === 401
      ? t.login.invalid
      : response.status === 429
        ? t.login.tooMany
        : t.login.unavailable;
  return { email, fieldErrors: {}, formError };
}
