import 'server-only';

interface HeaderReader {
  get(name: string): string | null;
}

/**
 * The visitor's IP: first entry of `x-forwarded-for`, `x-real-ip` as a fallback.
 * Forwarded to the api as `X-Client-IP` for rate limits (AD-002).
 */
export function getClientIp(headers: HeaderReader): string | undefined {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  return headers.get('x-real-ip')?.trim() || undefined;
}
