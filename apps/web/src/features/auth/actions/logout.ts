'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { clearSessionCookie, getAuthedApi } from '@/lib/session';

/** AUTH-05: the cookie goes away even when the api fails. */
export async function logout(): Promise<void> {
  try {
    const api = await getAuthedApi();
    await api.DELETE('/api/v1/auth/sessions/current');
  } catch (error) {
    // Keeps getAuthedApi's redirect to /session/end (no cookie, or a 401).
    unstable_rethrow(error);
  }

  await clearSessionCookie();
  redirect('/entrar');
}
