import 'server-only';
import type { ApiClient } from '@repo/api-client';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getApi } from './api';
import { getClientIp } from './client-ip';

export const SESSION_COOKIE = 'ah_session';
export const SESSION_END_PATH = '/session/end';

/** The session token, or `undefined` for a visitor without login. */
export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** AUTH-02. Cookie lasts 1 day; the api still owns the 7-day idle expiry (AUTH-06). */
export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Api client for the NGO area (SEC-05): sends the session token as Bearer.
 * Without the cookie, or on a 401 from the api, redirects to `/session/end`
 * (which clears the cookie and goes to `/entrar`, AUTH-07).
 */
export async function getAuthedApi(): Promise<ApiClient> {
  const token = await getSessionToken();
  if (!token) redirect(SESSION_END_PATH);

  const api = getApi({
    token,
    clientIp: getClientIp(await headers()),
  });

  api.use({
    onResponse({ response }) {
      if (response.status === 401) redirect(SESSION_END_PATH);
    },
  });

  return api;
}
