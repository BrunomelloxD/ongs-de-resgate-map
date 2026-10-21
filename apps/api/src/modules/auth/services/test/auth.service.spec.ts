import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import type { Mocked } from 'vitest';
import type { PasswordHasher } from '@/common/crypto/password-hasher.js';
import { RateLimitedException } from '@/common/rate-limit/rate-limited.exception.js';
import type { Ngo } from '@/generated/prisma/client.js';
import type { NgosService } from '@/modules/ngos/services/ngos.service.js';
import type { SessionsService } from '@/modules/sessions/services/sessions.service.js';
import { makeAuthNgo, makeRateLimiter } from '../../test-fixtures.js';
import { AuthService, loginKey } from '../auth.service.js';

const IP = '203.0.113.7';
const EMAIL = 'contato@patas.org';
const PASSWORD = 'senha1234';
const MINUTE = 60_000;
const START = new Date('2026-10-20T12:00:00.000Z');

function ngoWith(overrides: Partial<Ngo> = {}): Ngo {
  return makeAuthNgo({
    email: EMAIL,
    passwordHash: `hash:${PASSWORD}`,
    ...overrides,
  });
}

function setup(ngo: Ngo | null = ngoWith()) {
  const { rows, limiter } = makeRateLimiter();
  const ngos = {
    findByEmailForAuth: vi.fn(() => Promise.resolve(ngo)),
  } as unknown as Mocked<NgosService>;
  const sessions = {
    create: vi.fn(() => Promise.resolve({ token: 'novo-token' })),
    revoke: vi.fn(() => Promise.resolve()),
  } as unknown as Mocked<SessionsService>;
  // Fake hasher: "hash:{plain}" matches only {plain}.
  const hasher = {
    verify: vi.fn((hash: string, plain: string) =>
      Promise.resolve(hash === `hash:${plain}`),
    ),
  } as unknown as Mocked<PasswordHasher>;
  const service = new AuthService(ngos, sessions, limiter, hasher);
  return { rows, ngos, sessions, hasher, service };
}

const failure = new UnauthorizedException('E-mail ou senha incorretos.');

describe('AuthService.login', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('e-mail e senha certos → sessão nova, sem registrar tentativa (AUTH-02)', async () => {
    const { rows, sessions, service } = setup();

    expect(await service.login(EMAIL, PASSWORD, IP)).toEqual({
      token: 'novo-token',
    });
    expect(sessions.create).toHaveBeenCalledWith(ngoWith().id);
    expect(rows).toHaveLength(0);
  });

  it('e-mail inexistente e senha errada dão o mesmo 401 "E-mail ou senha incorretos." (AUTH-03)', async () => {
    const unknown = setup(null);
    const wrong = setup();

    await expect(unknown.service.login(EMAIL, PASSWORD, IP)).rejects.toEqual(
      failure,
    );
    await expect(wrong.service.login(EMAIL, 'errada123', IP)).rejects.toEqual(
      failure,
    );
    expect(unknown.sessions.create).not.toHaveBeenCalled();
    expect(wrong.sessions.create).not.toHaveBeenCalled();
  });

  it('e-mail inexistente também passa pela verificação de senha (tempo igual)', async () => {
    const { hasher, service } = setup(null);

    await expect(service.login(EMAIL, PASSWORD, IP)).rejects.toEqual(failure);

    expect(hasher.verify).toHaveBeenCalledTimes(1);
    expect(hasher.verify.mock.calls[0]?.[0]).toMatch(/^\$argon2id\$/);
  });

  it('cada falha registra uma tentativa; o acerto não', async () => {
    const { rows, service } = setup();

    await expect(service.login(EMAIL, 'errada123', IP)).rejects.toEqual(
      failure,
    );
    await service.login(EMAIL, PASSWORD, IP);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.bucket).toBe('login-fail');
  });

  it('6ª tentativa depois de 5 falhas → 429 "Muitas tentativas. Tente de novo em 15 minutos." mesmo com a senha certa (AUTH-04)', async () => {
    const { rows, sessions, hasher, service } = setup();
    for (let i = 0; i < 5; i++) {
      await expect(service.login(EMAIL, 'errada123', IP)).rejects.toEqual(
        failure,
      );
      vi.setSystemTime(new Date(Date.now() + MINUTE));
    }
    hasher.verify.mockClear();

    const blocked = service.login(EMAIL, PASSWORD, IP);

    await expect(blocked).rejects.toBeInstanceOf(RateLimitedException);
    const error = (await blocked.catch(
      (e: unknown) => e,
    )) as RateLimitedException;
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.message).toBe(
      'Muitas tentativas. Tente de novo em 15 minutos.',
    );
    // The first failure was 5 minutes ago: it leaves the window in 10.
    expect(error.retryAfterSeconds).toBe(10 * 60);
    expect(hasher.verify).not.toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
    // A blocked attempt does not extend the window.
    expect(rows).toHaveLength(5);
  });

  it('o bloqueio dura até o fim da janela de 15 minutos (AUTH-04)', async () => {
    const { service } = setup();
    for (let i = 0; i < 5; i++) {
      await service.login(EMAIL, 'errada123', IP).catch(() => undefined);
    }

    vi.setSystemTime(new Date(START.getTime() + 15 * MINUTE - 1));
    await expect(service.login(EMAIL, PASSWORD, IP)).rejects.toBeInstanceOf(
      RateLimitedException,
    );

    vi.setSystemTime(new Date(START.getTime() + 15 * MINUTE));
    expect(await service.login(EMAIL, PASSWORD, IP)).toEqual({
      token: 'novo-token',
    });
  });

  it('o limite é por IP e e-mail: outro IP ainda entra', async () => {
    const { service } = setup();
    for (let i = 0; i < 5; i++) {
      await service.login(EMAIL, 'errada123', IP).catch(() => undefined);
    }

    expect(await service.login(EMAIL, PASSWORD, '198.51.100.1')).toEqual({
      token: 'novo-token',
    });
  });

  it('o mesmo e-mail com outra caixa ou espaços conta no mesmo limite', () => {
    expect(loginKey(IP, '  Contato@Patas.ORG ')).toBe(loginKey(IP, EMAIL));
  });

  it('ONG isSeed com a senha "certa" → 401 (DEMO-19)', async () => {
    const { sessions, service } = setup(ngoWith({ isSeed: true }));

    await expect(service.login(EMAIL, PASSWORD, IP)).rejects.toEqual(failure);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('ONG suspensa com a senha certa → 401', async () => {
    const { sessions, service } = setup(ngoWith({ status: 'SUSPENDED' }));

    await expect(service.login(EMAIL, PASSWORD, IP)).rejects.toEqual(failure);
    expect(sessions.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.logout', () => {
  it('revoga a sessão atual (AUTH-05)', async () => {
    const { sessions, service } = setup();

    await service.logout('sessao-1');

    expect(sessions.revoke).toHaveBeenCalledWith('sessao-1');
  });
});
