import {
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { PasswordHasher } from '@/common/crypto/password-hasher.js';
import { hashToken, newToken } from '@/common/crypto/token.js';
import { RateLimitedException } from '@/common/rate-limit/rate-limited.exception.js';
import { RateLimiter } from '@/common/rate-limit/rate-limiter.service.js';
import { IMailer } from '@/modules/mail/adapters/smtp-mailer.js';
import { passwordResetEmail } from '@/modules/mail/templates/password-reset.js';
import { NgosService } from '@/modules/ngos/services/ngos.service.js';
import { SessionsService } from '@/modules/sessions/services/sessions.service.js';
import { IPasswordResetsRepository } from '../repositories/password-resets.repository.interface.js';

const HOUR_MS = 60 * 60 * 1000;

/** AUTH-09: the link is valid for 1 hour. */
export const RESET_TTL_MS = HOUR_MS;

/** AUTH-11: 3 requests per hour per e-mail and per IP. */
export const RESET_LIMITS = [
  { bucket: 'reset-email', windowMs: HOUR_MS, max: 3 },
  { bucket: 'reset-ip', windowMs: HOUR_MS, max: 3 },
] as const;

export const RESET_BLOCKED = 'Muitos pedidos. Tente de novo em 1 hora.';
export const RESET_LINK_GONE = 'Este link expirou ou já foi usado.';
export const WRONG_CURRENT_PASSWORD = 'Senha atual incorreta.';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    private readonly ngos: NgosService,
    private readonly sessions: SessionsService,
    private readonly resets: IPasswordResetsRepository,
    private readonly limiter: RateLimiter,
    private readonly hasher: PasswordHasher,
    private readonly mailer: IMailer,
    private readonly config: AppConfigService,
  ) {}

  /**
   * AUTH-08: the answer never tells whether the account exists. Requests for
   * unknown e-mails count too, so the 429 does not tell it either.
   */
  async requestReset(email: string, ip: string): Promise<void> {
    const address = email.trim().toLowerCase();
    const keys = [address, ip];
    const checks = await Promise.all(
      RESET_LIMITS.map(({ bucket, windowMs, max }, i) =>
        this.limiter.peek(bucket, keys[i]!, windowMs, max),
      ),
    );
    const blocked = checks.filter((check) => !check.allowed);
    if (blocked.length > 0) {
      const wait = Math.max(...blocked.map((check) => check.retryAfterMs));
      throw new RateLimitedException(RESET_BLOCKED, wait);
    }
    // Both limits record together, so a refused request spends neither.
    await Promise.all(
      RESET_LIMITS.map(({ bucket, windowMs, max }, i) =>
        this.limiter.hit(bucket, keys[i]!, windowMs, max),
      ),
    );

    const ngo = await this.ngos.findByEmailForAuth(address);
    if (!ngo || ngo.isSeed || ngo.status !== 'ACTIVE') {
      return;
    }
    const token = newToken();
    await this.resets.create({
      ngoId: ngo.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });
    // Not awaited: the SMTP time would tell that the account exists.
    void this.mailer
      .send({
        to: ngo.email,
        ...passwordResetEmail({ webUrl: this.config.webUrl, token }),
      })
      .catch((error: unknown) => {
        // Never the recipient: only the error type reaches the log.
        this.logger.warn(
          `Password reset e-mail not sent (${(error as Error).name})`,
        );
      });
  }

  /** AUTH-12, AUTH-13: single use, then every session of the NGO ends. */
  async resetWithToken(token: string, password: string): Promise<void> {
    const reset = await this.resets.findByTokenHash(hashToken(token));
    const now = new Date();
    if (
      !reset ||
      reset.usedAt !== null ||
      now.getTime() > reset.expiresAt.getTime() ||
      !(await this.resets.markUsed(reset.id, now))
    ) {
      throw new GoneException(RESET_LINK_GONE);
    }
    // updatePassword hashes the plain password itself.
    await this.ngos.updatePassword(reset.ngoId, password);
    await this.sessions.revokeAllOf(reset.ngoId);
  }

  /** PROF-05, PROF-06: the other sessions end; the current one stays. */
  async changePassword(
    ngoId: string,
    sessionId: string,
    current: string,
    next: string,
  ): Promise<void> {
    const ngo = await this.ngos.findByIdForAuth(ngoId);
    if (!ngo) {
      throw new NotFoundException('ONG não encontrada.');
    }
    if (!(await this.hasher.verify(ngo.passwordHash, current))) {
      throw new ForbiddenException(WRONG_CURRENT_PASSWORD);
    }
    await this.ngos.updatePassword(ngoId, next);
    await this.sessions.revokeAllOf(ngoId, sessionId);
  }
}
