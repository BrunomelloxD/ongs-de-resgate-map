import type { SessionStatus } from '@/components/ui/navbar.client';
import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';
import { getSessionToken } from '@/lib/session';

const NO_STORE = { 'Cache-Control': 'no-store' };

function answer(status: SessionStatus): Response {
  return Response.json(status, { headers: NO_STORE });
}

/**
 * T196: the navbar asks this after hydration, so the public pages never read
 * the cookie. Only the name and the avatar leave; it never writes or clears a
 * cookie, so a visitor gets none (SEC-03).
 */
export async function GET(request: Request): Promise<Response> {
  const token = await getSessionToken();
  if (!token) return answer({ loggedIn: false });

  const { data } = await getApi({
    token,
    clientIp: getClientIp(request.headers),
  }).GET('/api/v1/me/ngo');
  // A 401 (expired or cleaned-up session) or any failure: shown as a visitor.
  if (!data) return answer({ loggedIn: false });

  return answer({
    loggedIn: true,
    name: data.legalName,
    ...(data.imageUrl ? { avatarUrl: data.imageUrl } : {}),
  });
}
