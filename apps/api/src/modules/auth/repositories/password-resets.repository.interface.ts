import type { PasswordReset } from '@/generated/prisma/client.js';

export interface NewPasswordReset {
  ngoId: string;
  /** SHA-256 of the token; the token itself is never stored (AUTH-14). */
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Only the domain methods: no generic CRUD (ARCHITECTURE §5.4).
 * Abstract class (not an interface) so it works as a DI token.
 */
export abstract class IPasswordResetsRepository {
  abstract create(data: NewPasswordReset): Promise<void>;
  abstract findByTokenHash(tokenHash: string): Promise<PasswordReset | null>;
  /** Single use (AUTH-13): false when the link was already used. */
  abstract markUsed(id: string, usedAt: Date): Promise<boolean>;
}
