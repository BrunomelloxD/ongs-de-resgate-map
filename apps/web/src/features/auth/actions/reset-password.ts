'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getApi } from '@/lib/api';
import { formText } from '@/lib/form-data';
import { newPasswordSchema } from '@/lib/password';
import { authDictionary } from '../auth.dictionary';
import type { ResetPasswordState } from '../auth.types';

const t = authDictionary.reset;

/**
 * POST /auth/password-resets/:token (AUTH-12, AUTH-13). Bound to the link's
 * token by the page; the api ends every session of the NGO.
 */
export async function resetPassword(
  token: string,
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = newPasswordSchema.safeParse({
    password: formText(formData, 'password'),
    confirmation: formText(formData, 'confirmation'),
  });
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors;
    return {
      fieldErrors: {
        password: errors.password?.[0],
        confirmation: errors.confirmation?.[0],
      },
    };
  }

  const { response } = await getApi().POST(
    '/api/v1/auth/password-resets/{token}',
    {
      params: { path: { token } },
      body: { password: parsed.data.password },
    },
  );

  if (response.status === 204) redirect('/entrar?senha=alterada');
  if (response.status === 410) return { fieldErrors: {}, linkGone: t.linkGone };
  return { fieldErrors: {}, formError: t.unavailable };
}
