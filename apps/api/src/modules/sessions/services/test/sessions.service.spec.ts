import { createHash } from 'node:crypto';
import type { Session } from '@/generated/prisma/client.js';
import type { ISessionsRepository } from '../../repositories/sessions.repository.interface.js';
import { makeSession } from '../../test-fixtures.js';
import { SessionsService } from '../sessions.service.js';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

/** In-memory stand-in for the sessions table. */
function fakeRepository() {
  const rows: Session[] = [];
  const repository = {
    create: vi.fn(
      ({ ngoId, tokenHash }: { ngoId: string; tokenHash: string }) => {
        const row = makeSession({
          id: `s-${rows.length + 1}`,
          ngoId,
          tokenHash,
          lastUsedAt: new Date(),
          createdAt: new Date(),
        });
        rows.push(row);
        return Promise.resolve(row);
      },
    ),
    findByTokenHash: vi.fn((tokenHash: string) =>
      Promise.resolve(rows.find((row) => row.tokenHash === tokenHash) ?? null),
    ),
    touch: vi.fn((id: string, lastUsedAt: Date) => {
      rows.find((row) => row.id === id)!.lastUsedAt = lastUsedAt;
      return Promise.resolve();
    }),
    delete: vi.fn(() => Promise.resolve()),
    deleteAllOf: vi.fn(() => Promise.resolve(2)),
    deleteExpired: vi.fn(),
  };
  return { rows, repository };
}

function setup() {
  const { rows, repository } = fakeRepository();
  const service = new SessionsService(
    repository as unknown as ISessionsRepository,
  );
  return { rows, repository, service };
}

function advance(ms: number) {
  vi.setSystemTime(new Date(Date.now() + ms));
}

describe('SessionsService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('devolve um token de 32 bytes e o banco recebe só o SHA-256 dele (AUTH-14)', async () => {
      const { rows, service } = setup();

      const { token } = await service.create('ngo-1');

      expect(Buffer.from(token, 'base64url')).toHaveLength(32);
      expect(rows).toHaveLength(1);
      expect(rows[0].ngoId).toBe('ngo-1');
      expect(rows[0].tokenHash).toBe(sha256(token));
      expect(Object.values(rows[0])).not.toContain(token);
    });

    it('cada sessão recebe um token diferente', async () => {
      const { service } = setup();

      const a = await service.create('ngo-1');
      const b = await service.create('ngo-1');

      expect(a.token).not.toBe(b.token);
    });
  });

  describe('resolve', () => {
    it('devolve a ONG e a sessão do token', async () => {
      const { service } = setup();
      const { token } = await service.create('ngo-1');

      expect(await service.resolve(token)).toEqual({
        ngoId: 'ngo-1',
        sessionId: 's-1',
      });
    });

    it('token desconhecido resolve null', async () => {
      const { service } = setup();
      await service.create('ngo-1');

      expect(await service.resolve('token-que-nao-existe')).toBeNull();
    });

    it('sessão com 6 dias e 23 h sem uso ainda resolve (AUTH-06)', async () => {
      const { service } = setup();
      const { token } = await service.create('ngo-1');

      advance(6 * DAY + 23 * HOUR);

      expect(await service.resolve(token)).toEqual({
        ngoId: 'ngo-1',
        sessionId: 's-1',
      });
    });

    it('sessão com 7 dias sem uso resolve null (AUTH-06)', async () => {
      const { service } = setup();
      const { token } = await service.create('ngo-1');

      advance(7 * DAY);

      expect(await service.resolve(token)).toBeNull();
    });

    it('o uso renova o prazo: 6 dias, uso, mais 6 dias ainda resolve', async () => {
      const { service } = setup();
      const { token } = await service.create('ngo-1');

      advance(6 * DAY);
      await service.resolve(token);
      advance(6 * DAY);

      expect(await service.resolve(token)).not.toBeNull();
    });

    it('lastUsedAt não é atualizado duas vezes no mesmo minuto', async () => {
      const { rows, repository, service } = setup();
      const { token } = await service.create('ngo-1');

      advance(5 * MINUTE);
      await service.resolve(token);
      const touchedAt = new Date(Date.now());
      advance(30_000);
      await service.resolve(token);
      advance(29_000);
      await service.resolve(token);

      expect(repository.touch).toHaveBeenCalledTimes(1);
      expect(rows[0].lastUsedAt).toEqual(touchedAt);
    });

    it('atualiza lastUsedAt de novo depois de 1 minuto', async () => {
      const { rows, repository, service } = setup();
      const { token } = await service.create('ngo-1');

      advance(MINUTE);
      await service.resolve(token);
      advance(MINUTE);
      await service.resolve(token);

      expect(repository.touch).toHaveBeenCalledTimes(2);
      expect(rows[0].lastUsedAt).toEqual(new Date(NOW.getTime() + 2 * MINUTE));
    });

    it('não grava nada logo depois de criada', async () => {
      const { repository, service } = setup();
      const { token } = await service.create('ngo-1');

      advance(59_999);
      await service.resolve(token);

      expect(repository.touch).not.toHaveBeenCalled();
    });

    it('sessão vencida não renova lastUsedAt', async () => {
      const { rows, repository, service } = setup();
      const { token } = await service.create('ngo-1');

      advance(8 * DAY);
      await service.resolve(token);

      expect(repository.touch).not.toHaveBeenCalled();
      expect(rows[0].lastUsedAt).toEqual(NOW);
    });
  });

  describe('revoke', () => {
    it('apaga a sessão informada (AUTH-05)', async () => {
      const { repository, service } = setup();

      await service.revoke('s-9');

      expect(repository.delete).toHaveBeenCalledWith('s-9');
    });
  });

  describe('revokeAllOf', () => {
    it('apaga todas as sessões da ONG (AUTH-12)', async () => {
      const { repository, service } = setup();

      expect(await service.revokeAllOf('ngo-1')).toBe(2);
      expect(repository.deleteAllOf).toHaveBeenCalledWith('ngo-1', undefined);
    });

    it('mantém a sessão atual (PROF-05)', async () => {
      const { repository, service } = setup();

      await service.revokeAllOf('ngo-1', 's-atual');

      expect(repository.deleteAllOf).toHaveBeenCalledWith('ngo-1', 's-atual');
    });
  });
});
