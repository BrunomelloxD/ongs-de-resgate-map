export interface ExpiredNgo {
  id: string;
  /** Animals that the cascade will remove with the NGO. */
  animals: number;
}

/**
 * Only what the cleanup needs. Own repository, so demo does not import `ngos`
 * (it would close a cycle). Abstract class (not an interface) so it works as a DI token.
 */
export abstract class ICleanupRepository {
  /** Not-seed NGOs whose `expiresAt` has passed (DEMO-14, DEMO-19). */
  abstract findExpiredNgos(now: Date): Promise<ExpiredNgo[]>;
  /** Cascades to animals, images, hours, sessions and resets. */
  abstract deleteNgo(id: string): Promise<void>;
  /** Returns how many rows were removed. */
  abstract deleteRateLimitHitsBefore(before: Date): Promise<number>;
  /** Links whose `expiresAt` has passed; returns how many. */
  abstract deleteExpiredPasswordResets(now: Date): Promise<number>;
}
