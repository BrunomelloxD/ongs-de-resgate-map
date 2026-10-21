import {
  ForbiddenException,
  GoneException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Mocked } from 'vitest';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import type { PasswordHasher } from '@/common/crypto/password-hasher.js';
import { hashToken } from '@/common/crypto/token.js';
import { RateLimitedException } from '@/common/rate-limit/rate-limited.exception.js';
import type { PasswordReset } from '@/generated/prisma/client.js';
import {
  type IMailer,
  MailDeliveryFailed,
} from '@/modules/mail/adapters/smtp-mailer.js';
import type { NgosService } from '@/modules/ngos/services/ngos.service.js';
import type { SessionsService } from '@/modules/sessions/services/sessions.service.js';
import type { IPasswordResetsRepository } from '../../repositories/password-resets.repository.interface.js';
import { makeAuthNgo, makeRateLimiter } from '../../test-fixtures.js';
import { PasswordService } from '../password.service.js';

const IP = '203.0.113.7';
const EMAIL = 'contato@patas.org';
const WEB_URL = 'https://animal-helper.example';
const START = new Date('2026-10-20T12:00:00.000Z');
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const SESSION_ID = 'sessao-atual';

/** In-memory password_resets with the repository's contract. */
function fakeResets() {
  const rows: PasswordReset[] = [];
  const resets: IPasswordResetsRepository = {
    create: (data) => {
      rows.push({
        id: `reset-${rows.length + 1}`,
        usedAt: null,
        createdAt: new Date(),
        ...data,
      });
      return Promise.resolve();
    },
    findByTokenHash: (tokenHash) =>
      Promise.resolve(rows.find((row) => row.tokenHash === tokenHash) ?? null),
    markUsed: (id, usedAt) => {
      const row = rows.find((r) => r.id === id && r.usedAt === null);
      if (row) {
        row.usedAt = usedAt;
      }
      return Promise.resolve(row !== undefined);
    },
  };
  return { rows, resets };
}

function setup(
  ngo = makeAuthNgo({ email: EMAIL, passwordHash: 'hash:atual123' }),
) {
  const { rows: hits, limiter } = makeRateLimiter();
  const { rows: resetRows, resets } = fakeResets();
  const ngos = {
    findByEmailForAuth: vi.fn((email: string) =>
      Promise.resolve(email === ngo?.email ? ngo : null),
    ),
    findByIdForAuth: vi.fn(() => Promise.resolve(ngo)),
    updatePassword: vi.fn(() => Promise.resolve()),
  } as unknown as Mocked<NgosService>;
  const sessions = {
    revokeAllOf: vi.fn(() => Promise.resolve(2)),
  } as unknown as Mocked<SessionsService>;
  const hasher = {
    verify: vi.fn((hash: string, plain: string) =>
      Promise.resolve(hash === `hash:${plain}`),
    ),
  } as unknown as Mocked<PasswordHasher>;
  const sent: { to: string; text: string }[] = [];
  const mailer = {
    send: vi.fn((message: { to: string; text: string }) => {
      sent.push(message);
      return Promise.resolve();
    }),
  } as unknown as Mocked<IMailer>;
  const service = new PasswordService(
    ngos,
    sessions,
    resets,
    limiter,
    hasher,
    mailer,
    { webUrl: WEB_URL } as AppConfigService,
  );
  return { hits, resets, resetRows, ngos, sessions, mailer, sent, service };
}

/** The token is only in the e-mail link. */
function tokenFrom(text: string): string {
  return /\/recuperar-senha\/([A-Za-z0-9_-]+)/.exec(text)![1]!;
}

async function blockedError(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(RateLimitedException);
  return error as RateLimitedException;
}

describe('PasswordService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('requestReset', () => {
    it('conta existente → e-mail com link de uso único e o token guardado só como hash (AUTH-09, AUTH-14)', async () => {
      const { resetRows, sent, service } = setup();

      await service.requestReset(EMAIL, IP);

      expect(sent).toHaveLength(1);
      expect(sent[0]?.to).toBe(EMAIL);
      const token = tokenFrom(sent[0]!.text);
      expect(sent[0]?.text).toContain(`${WEB_URL}/recuperar-senha/${token}`);
      expect(resetRows).toHaveLength(1);
      expect(resetRows[0]).toMatchObject({
        tokenHash: hashToken(token),
        expiresAt: new Date(START.getTime() + HOUR),
        usedAt: null,
      });
      expect(resetRows[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(resetRows)).not.toContain(token);
    });

    it('e-mail inexistente → termina sem erro e sem envio (AUTH-08)', async () => {
      const { resetRows, mailer, service } = setup();

      await expect(
        service.requestReset('ninguem@exemplo.org', IP),
      ).resolves.toBeUndefined();

      expect(mailer.send).not.toHaveBeenCalled();
      expect(resetRows).toHaveLength(0);
    });

    it.each([
      ['seed', { isSeed: true }],
      ['suspensa', { status: 'SUSPENDED' as const }],
    ])('ONG %s → sem envio', async (_case, overrides) => {
      const { mailer, service } = setup(
        makeAuthNgo({ email: EMAIL, ...overrides }),
      );

      await service.requestReset(EMAIL, IP);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('4º pedido na hora para o mesmo e-mail → 429 "Muitos pedidos. Tente de novo em 1 hora." (AUTH-11)', async () => {
      const { sent, service } = setup();
      for (const ip of ['198.51.100.1', '198.51.100.2', '198.51.100.3']) {
        await service.requestReset(EMAIL, ip);
      }

      const error = await blockedError(
        service.requestReset(EMAIL, '198.51.100.4'),
      );

      expect(error.getStatus()).toBe(429);
      expect(error.message).toBe('Muitos pedidos. Tente de novo em 1 hora.');
      expect(error.retryAfterSeconds).toBe(3600);
      expect(sent).toHaveLength(3);
    });

    it('4º pedido na hora do mesmo IP, com e-mails diferentes → 429 (AUTH-11)', async () => {
      const { service } = setup();
      for (const email of ['a@exemplo.org', 'b@exemplo.org', 'c@exemplo.org']) {
        await service.requestReset(email, IP);
      }

      await blockedError(service.requestReset(EMAIL, IP));
    });

    it('e-mail com outra caixa conta no mesmo limite', async () => {
      const { service } = setup();
      await service.requestReset(EMAIL, '198.51.100.1');
      await service.requestReset('CONTATO@patas.org', '198.51.100.2');
      await service.requestReset(' Contato@Patas.org ', '198.51.100.3');

      await blockedError(service.requestReset(EMAIL, '198.51.100.4'));
    });

    it('pedido recusado pelo IP não gasta a cota do e-mail', async () => {
      const { hits, service } = setup();
      for (const email of ['a@exemplo.org', 'b@exemplo.org', 'c@exemplo.org']) {
        await service.requestReset(email, IP);
      }

      await blockedError(service.requestReset(EMAIL, IP));

      expect(hits).toHaveLength(6);
    });

    it('depois de 1 hora o limite libera', async () => {
      const { service } = setup();
      for (let i = 0; i < 3; i++) {
        await service.requestReset(EMAIL, IP);
      }

      vi.setSystemTime(new Date(START.getTime() + HOUR));

      await expect(service.requestReset(EMAIL, IP)).resolves.toBeUndefined();
    });

    it('falha do SMTP → só log, sem o e-mail do destinatário, e o pedido termina normalmente (AUTH-08)', async () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      const { mailer, service } = setup();
      mailer.send.mockRejectedValueOnce(
        new MailDeliveryFailed({ cause: new Error(`550 ${EMAIL} rejected`) }),
      );

      await expect(service.requestReset(EMAIL, IP)).resolves.toBeUndefined();
      await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));

      expect(warn).toHaveBeenCalledWith(
        'Password reset e-mail not sent (MailDeliveryFailed)',
      );
      expect(JSON.stringify(warn.mock.calls)).not.toContain(EMAIL);
    });
  });

  describe('resetWithToken', () => {
    async function requested() {
      const ctx = setup();
      await ctx.service.requestReset(EMAIL, IP);
      return { ...ctx, token: tokenFrom(ctx.sent[0]!.text) };
    }

    const gone = new GoneException('Este link expirou ou já foi usado.');

    it('link válido → grava a senha nova, marca usedAt e revoga todas as sessões (AUTH-12)', async () => {
      const { resetRows, ngos, sessions, service, token } = await requested();
      const ngoId = resetRows[0]!.ngoId;
      vi.setSystemTime(new Date(START.getTime() + HOUR));

      await service.resetWithToken(token, 'novaSenha1');

      expect(ngos.updatePassword).toHaveBeenCalledWith(ngoId, 'novaSenha1');
      expect(sessions.revokeAllOf).toHaveBeenCalledWith(ngoId);
      expect(resetRows[0]?.usedAt).toEqual(new Date(START.getTime() + HOUR));
    });

    it('token com 1 h e 1 s → 410 "Este link expirou ou já foi usado." (AUTH-13)', async () => {
      const { ngos, sessions, service, token } = await requested();
      vi.setSystemTime(new Date(START.getTime() + HOUR + SECOND));

      await expect(service.resetWithToken(token, 'novaSenha1')).rejects.toEqual(
        gone,
      );
      expect(ngos.updatePassword).not.toHaveBeenCalled();
      expect(sessions.revokeAllOf).not.toHaveBeenCalled();
    });

    it('link já usado → 410 (AUTH-13)', async () => {
      const { ngos, service, token } = await requested();
      await service.resetWithToken(token, 'novaSenha1');

      await expect(
        service.resetWithToken(token, 'outraSenha2'),
      ).rejects.toEqual(gone);
      expect(ngos.updatePassword).toHaveBeenCalledTimes(1);
    });

    it('outro pedido marcou o link antes → 410 sem trocar a senha', async () => {
      const { resets, resetRows, ngos, service, token } = await requested();
      const row = resetRows[0]!;
      // The lookup still sees it unused; the conditional update does not.
      vi.spyOn(resets, 'findByTokenHash').mockResolvedValueOnce({ ...row });
      row.usedAt = new Date();

      await expect(service.resetWithToken(token, 'novaSenha1')).rejects.toEqual(
        gone,
      );
      expect(ngos.updatePassword).not.toHaveBeenCalled();
    });

    it('token desconhecido → 410', async () => {
      const { service } = setup();

      await expect(
        service.resetWithToken('token-inventado', 'novaSenha1'),
      ).rejects.toEqual(gone);
    });
  });

  describe('changePassword', () => {
    it('senha atual certa → grava a nova e revoga as outras sessões, mantendo a atual (PROF-05)', async () => {
      const { ngos, sessions, service } = setup();
      const ngoId = makeAuthNgo().id;

      await service.changePassword(ngoId, SESSION_ID, 'atual123', 'novaSenha1');

      expect(ngos.updatePassword).toHaveBeenCalledWith(ngoId, 'novaSenha1');
      expect(sessions.revokeAllOf).toHaveBeenCalledWith(ngoId, SESSION_ID);
    });

    it('senha atual errada → 403 "Senha atual incorreta." e nada muda (PROF-06)', async () => {
      const { ngos, sessions, service } = setup();

      await expect(
        service.changePassword(
          makeAuthNgo().id,
          SESSION_ID,
          'errada123',
          'novaSenha1',
        ),
      ).rejects.toEqual(new ForbiddenException('Senha atual incorreta.'));
      expect(ngos.updatePassword).not.toHaveBeenCalled();
      expect(sessions.revokeAllOf).not.toHaveBeenCalled();
    });

    it('ONG apagada no meio da sessão → 404', async () => {
      const { ngos, service } = setup();
      ngos.findByIdForAuth.mockResolvedValueOnce(null);

      await expect(
        service.changePassword('sumiu', SESSION_ID, 'atual123', 'novaSenha1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
