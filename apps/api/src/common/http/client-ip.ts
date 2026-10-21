import type { IncomingHttpHeaders } from 'node:http';

/**
 * Visitor IP. The web sends it in X-Client-IP; it is only trustworthy after
 * InternalTokenGuard, since anyone with the token could forge it (AD-002).
 */
export function getClientIp(req: {
  headers: IncomingHttpHeaders;
  ip?: string;
}): string {
  const forwarded = req.headers['x-client-ip']
    ?.toString()
    .split(',')[0]
    ?.trim();
  return forwarded || req.ip || 'unknown';
}
