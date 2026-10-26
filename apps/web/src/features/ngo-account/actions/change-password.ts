'use server';

import { z } from 'zod';
import { formText } from '@/lib/form-data';
import { newPasswordSchema } from '@/lib/password';
import { getAuthedApi } from '@/lib/session';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type { ChangePasswordState } from '../ngo-account.types';

const t = ngoAccountDictionary.password;

const inputSchema = z.intersection(
  z.object({ currentPassword: z.string().min(1, t.currentRequired) }),
  newPasswordSchema,
);

/**
 * PUT /me/password (PROF-05, PROF-06): the api revokes the other sessions and
 * keeps this one, so the NGO stays on the page.
 */
export async function changePassword(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = inputSchema.safeParse({
    currentPassword: formText(formData, 'currentPassword'),
    password: formText(formData, 'password'),
    confirmation: formText(formData, 'confirmation'),
  });
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors;
    return {
      fieldErrors: {
        currentPassword: errors.currentPassword?.[0],
        password: errors.password?.[0],
        confirmation: errors.confirmation?.[0],
      },
    };
  }

  const { currentPassword, password } = parsed.data;
  const api = await getAuthedApi();
  const { response } = await api.PUT('/api/v1/me/password', {
    body: { currentPassword, password },
  });

  if (response.status === 204) {
    return { fieldErrors: {}, success: { message: t.changed, at: Date.now() } };
  }
  if (response.status === 403) {
    return { fieldErrors: { currentPassword: t.wrongCurrent } };
  }
  if (response.status === 404)
    return { fieldErrors: {}, formError: t.ngoNotFound };
  return { fieldErrors: {}, formError: t.unavailable };
}
