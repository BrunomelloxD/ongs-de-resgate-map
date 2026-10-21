import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordHasher } from '@/common/crypto/password-hasher.js';
import { RateLimitedException } from '@/common/rate-limit/rate-limited.exception.js';
import { RateLimiter } from '@/common/rate-limit/rate-limiter.service.js';
import type { Ngo } from '@/generated/prisma/client.js';
import { NgosService } from '@/modules/ngos/services/ngos.service.js';
import { SessionsService } from '@/modules/sessions/services/sessions.service.js';

const MINUTE_MS = 60_000;

/** AUTH-04: 5 failures in 15 minutes per IP and e-mail. */
export const LOGIN_LIMIT = {
  bucket: 'login-fail',
  windowMs: 15 * MINUTE_MS,
  max: 5,
} as const;

export const LOGIN_FAILED = 'E-mail ou senha incorretos.';
export const LOGIN_BLOCKED = 'Muitas tentativas. Tente de novo em 15 minutos.';

// Argon2id hash of a random secret: an unknown e-mail costs the same
// verification time as a known one, so timing does not reveal accounts (AUTH-03).
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$aWIlFNjvte+pJDXIHdUjow$aPh+N4oa0I4Ez/ilKLXzrx0ncpIealCZhdrqlVzekzo';

/** The e-mail is citext: the same address in any case shares one limit. */
export function loginKey(ip: string, email: string): string {
  return `${ip}|${email.trim().toLowerCase()}`;
}

/** Seeds never log in (DEMO-19), and neither do suspended NGOs. */
function canLogIn(ngo: Ngo | null): ngo is Ngo {
  return ngo !== null && !ngo.isSeed && ngo.status === 'ACTIVE';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly ngos: NgosService,
    private readonly sessions: SessionsService,
    private readonly limiter: RateLimiter,
    private readonly hasher: PasswordHasher,
  ) {}

  /** AUTH-02 to AUTH-04: the limit is checked first and grows only on failure. */
  async login(
    email: string,
    password: string,
    ip: string,
  ): Promise<{ token: string }> {
    const { bucket, windowMs, max } = LOGIN_LIMIT;
    const key = loginKey(ip, email);
    const limit = await this.limiter.peek(bucket, key, windowMs, max);
    if (!limit.allowed) {
      throw new RateLimitedException(LOGIN_BLOCKED, limit.retryAfterMs);
    }

    const ngo = await this.ngos.findByEmailForAuth(email.trim());
    const matches = await this.hasher.verify(
      ngo?.passwordHash ?? DUMMY_HASH,
      password,
    );
    if (!matches || !canLogIn(ngo)) {
      await this.limiter.hit(bucket, key, windowMs, max);
      throw new UnauthorizedException(LOGIN_FAILED);
    }
    return this.sessions.create(ngo.id);
  }

  /** AUTH-05: the token stops working at once. */
  logout(sessionId: string): Promise<void> {
    return this.sessions.revoke(sessionId);
  }
}
