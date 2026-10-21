import { createHash, randomBytes } from 'node:crypto';

/** Opaque token: 32 random bytes, 43 base64url characters. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Only this hash is stored; the token itself never reaches the database. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
