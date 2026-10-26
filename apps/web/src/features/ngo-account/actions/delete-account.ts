'use server';

import { redirect } from 'next/navigation';
import { clearSessionCookie, getAuthedApi } from '@/lib/session';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type { DeleteAccountResult } from '../ngo-account.types';

const t = ngoAccountDictionary;

const ACCOUNT_DELETED_PATH = '/?conta=excluida';

/**
 * DELETE /me/ngo (PROF-07, PROF-08): the api empties the bucket prefix first and
 * answers 503 when it can't, leaving everything in place.
 */
export async function deleteAccount(
  password: string,
): Promise<DeleteAccountResult> {
  if (typeof password !== 'string' || password === '') {
    return { error: t.password.currentRequired };
  }

  const api = await getAuthedApi();
  const { response } = await api.DELETE('/api/v1/me/ngo', {
    body: { password },
  });

  if (response.status === 204) {
    await clearSessionCookie();
    redirect(ACCOUNT_DELETED_PATH);
  }
  if (response.status === 403) return { error: t.password.wrongCurrent };
  return { error: t.deleteAccount.unavailable };
}
