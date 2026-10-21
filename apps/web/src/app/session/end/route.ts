import { clearSessionCookie } from '@/lib/session';

/**
 * Landing point for an invalid session (AUTH-07): clears the cookie and goes to /entrar.
 * Relative Location: behind the proxy, `request.url` may carry the internal host.
 */
export async function GET(): Promise<Response> {
  await clearSessionCookie();

  return new Response(null, {
    status: 307,
    headers: { Location: '/entrar', 'Cache-Control': 'no-store' },
  });
}
