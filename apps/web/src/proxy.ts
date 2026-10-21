import { NextResponse, type NextRequest } from 'next/server';

// Literal on purpose: Next reads it statically. Same value as SESSION_COOKIE in lib/session.ts.
const SESSION_COOKIE = 'ah_session';

/**
 * Optimistic check only (AUTH-07): without the cookie, goes to /entrar.
 * The real validation is the api's; a 401 there leads to /session/end.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL('/entrar', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/painel/:path*'],
};
