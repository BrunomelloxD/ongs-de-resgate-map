import { Injectable } from '@nestjs/common';
import { hashToken, newToken } from '@/common/crypto/token.js';
import { ISessionsRepository } from '../repositories/sessions.repository.interface.js';

const MINUTE_MS = 60_000;
/** AUTH-06: a session expires after 7 days without use. */
export const SESSION_IDLE_TTL_MS = 7 * 24 * 60 * MINUTE_MS;
// Sliding expiry without one write per request.
const TOUCH_INTERVAL_MS = MINUTE_MS;

export interface SessionContext {
  ngoId: string;
  sessionId: string;
}

@Injectable()
export class SessionsService {
  constructor(private readonly sessions: ISessionsRepository) {}

  /** The token goes to the client once; only its hash is stored (AUTH-14). */
  async create(ngoId: string): Promise<{ token: string }> {
    const token = newToken();
    await this.sessions.create({ ngoId, tokenHash: hashToken(token) });
    return { token };
  }

  async resolve(token: string): Promise<SessionContext | null> {
    const session = await this.sessions.findByTokenHash(hashToken(token));
    if (!session) {
      return null;
    }
    const now = new Date();
    const idleMs = now.getTime() - session.lastUsedAt.getTime();
    if (idleMs >= SESSION_IDLE_TTL_MS) {
      return null;
    }
    if (idleMs >= TOUCH_INTERVAL_MS) {
      await this.sessions.touch(session.id, now);
    }
    return { ngoId: session.ngoId, sessionId: session.id };
  }

  revoke(sessionId: string): Promise<void> {
    return this.sessions.delete(sessionId);
  }

  /** AUTH-12 revokes every session; PROF-05 keeps the current one. */
  revokeAllOf(ngoId: string, exceptSessionId?: string): Promise<number> {
    return this.sessions.deleteAllOf(ngoId, exceptSessionId);
  }
}
