import type { Session } from '@/generated/prisma/client.js';

/**
 * Only the domain methods: sessions have no generic CRUD (ARCHITECTURE §5.4).
 * Abstract class (not an interface) so it works as a DI token.
 */
export abstract class ISessionsRepository {
  abstract create(data: { ngoId: string; tokenHash: string }): Promise<Session>;
  abstract findByTokenHash(tokenHash: string): Promise<Session | null>;
  abstract touch(id: string, lastUsedAt: Date): Promise<void>;
  abstract delete(id: string): Promise<void>;
  /** Returns how many sessions were removed. */
  abstract deleteAllOf(ngoId: string, exceptId?: string): Promise<number>;
  /** Removes sessions unused since `before`; returns how many. */
  abstract deleteExpired(before: Date): Promise<number>;
}
