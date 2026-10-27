import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { MediaService } from '@/modules/media/services/media.service.js';
import type { ISessionsRepository } from '@/modules/sessions/repositories/sessions.repository.interface.js';
import type {
  ExpiredNgo,
  ICleanupRepository,
} from '../../repositories/cleanup.repository.interface.js';
import { CleanupService } from '../cleanup.service.js';
import type { DemoAccountService } from '../demo-account.service.js';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface Options {
  expired?: ExpiredNgo[];
  /** Ids whose bucket removal fails with the 503 of MediaService. */
  failingNgos?: string[];
  pending?: { count: number; bytes: number };
  pendingFails?: boolean;
  /** What DemoAccountService.reset resolves to, or 'fails'. */
  demoReset?:
    { animals: number; objects: number; bytes: number } | null | 'fails';
}

function setup(options: Options = {}) {
  const prefixes: Record<string, { count: number; bytes: number }> = {
    'ngo-1': { count: 6, bytes: 1000 },
    'ngo-2': { count: 4, bytes: 500 },
    'ngo-3': { count: 2, bytes: 70 },
  };
  const cleanup = {
    findExpiredNgos: vi.fn().mockResolvedValue(options.expired ?? []),
    deleteNgo: vi.fn().mockResolvedValue(undefined),
    deleteRateLimitHitsBefore: vi.fn().mockResolvedValue(0),
    deleteExpiredPasswordResets: vi.fn().mockResolvedValue(0),
  };
  const media = {
    deleteNgoPrefix: vi.fn((id: string) =>
      options.failingNgos?.includes(id)
        ? Promise.reject(new ServiceUnavailableException())
        : Promise.resolve(prefixes[id]),
    ),
    deletePendingOlderThan: vi.fn(() =>
      options.pendingFails
        ? Promise.reject(new ServiceUnavailableException())
        : Promise.resolve(options.pending ?? { count: 0, bytes: 0 }),
    ),
  };
  const sessions = { deleteExpired: vi.fn().mockResolvedValue(0) };
  const demoAccount = {
    reset: vi.fn(() =>
      options.demoReset === 'fails'
        ? Promise.reject(new ServiceUnavailableException())
        : Promise.resolve(options.demoReset ?? null),
    ),
  };
  const service = new CleanupService(
    cleanup as unknown as ICleanupRepository,
    media as unknown as MediaService,
    sessions as unknown as ISessionsRepository,
    demoAccount as unknown as DemoAccountService,
  );
  return { service, cleanup, media, sessions, demoAccount };
}

describe('CleanupService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('apaga o prefixo e depois a linha de cada ONG vencida (DEMO-14)', async () => {
    const { service, cleanup, media } = setup({
      expired: [
        { id: 'ngo-1', animals: 3 },
        { id: 'ngo-2', animals: 0 },
      ],
    });

    const report = await service.run();

    expect(cleanup.findExpiredNgos).toHaveBeenCalledWith(NOW);
    expect(media.deleteNgoPrefix.mock.calls).toEqual([['ngo-1'], ['ngo-2']]);
    expect(cleanup.deleteNgo.mock.calls).toEqual([['ngo-1'], ['ngo-2']]);
    expect(report).toEqual({ ngos: 2, animals: 3, objects: 10, bytes: 1500 });
  });

  it('mantém a ONG cujo prefixo falha e apaga as outras (DEMO-17)', async () => {
    const { service, cleanup } = setup({
      expired: [
        { id: 'ngo-1', animals: 3 },
        { id: 'ngo-2', animals: 5 },
        { id: 'ngo-3', animals: 1 },
      ],
      failingNgos: ['ngo-2'],
    });

    const report = await service.run();

    expect(cleanup.deleteNgo.mock.calls).toEqual([['ngo-1'], ['ngo-3']]);
    expect(Logger.prototype.error).toHaveBeenCalledTimes(1);
    expect(report).toEqual({ ngos: 2, animals: 4, objects: 8, bytes: 1070 });
  });

  it('apaga os envios pendentes com mais de 24 h e soma ao relatório (DEMO-15)', async () => {
    const { service, media } = setup({
      expired: [{ id: 'ngo-3', animals: 1 }],
      pending: { count: 4, bytes: 300 },
    });

    const report = await service.run();

    expect(media.deletePendingOlderThan).toHaveBeenCalledWith(24);
    expect(report).toEqual({ ngos: 1, animals: 1, objects: 6, bytes: 370 });
  });

  it('se o bucket falha nos pendentes, loga e segue com o resto da limpeza (DEMO-15, DEMO-17)', async () => {
    const { service, cleanup, sessions } = setup({ pendingFails: true });

    const report = await service.run();

    expect(Logger.prototype.error).toHaveBeenCalledTimes(1);
    expect(cleanup.deleteExpiredPasswordResets).toHaveBeenCalledTimes(1);
    expect(sessions.deleteExpired).toHaveBeenCalledTimes(1);
    expect(report).toEqual({ ngos: 0, animals: 0, objects: 0, bytes: 0 });
  });

  it('apaga acessos de limite de taxa com mais de 1 h, sessões sem uso há 7 dias e resets vencidos', async () => {
    const { service, cleanup, sessions } = setup();

    await service.run();

    expect(cleanup.deleteRateLimitHitsBefore).toHaveBeenCalledWith(
      new Date(NOW.getTime() - HOUR_MS),
    );
    expect(sessions.deleteExpired).toHaveBeenCalledWith(
      new Date(NOW.getTime() - 7 * DAY_MS),
    );
    expect(cleanup.deleteExpiredPasswordResets).toHaveBeenCalledWith(NOW);
  });

  it('sem nada vencido o relatório é todo zero e nada é apagado (DEMO-18)', async () => {
    const { service, cleanup, media } = setup();

    const report = await service.run();

    expect(report).toEqual({ ngos: 0, animals: 0, objects: 0, bytes: 0 });
    expect(media.deleteNgoPrefix).not.toHaveBeenCalled();
    expect(cleanup.deleteNgo).not.toHaveBeenCalled();
  });

  it('loga as 4 contagens (DEMO-16)', async () => {
    const { service } = setup({
      expired: [{ id: 'ngo-1', animals: 3 }],
      pending: { count: 1, bytes: 30 },
    });

    await service.run();

    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.objectContaining({
        ngos: 1,
        animals: 3,
        objects: 7,
        bytes: 1030,
      }),
    );
  });

  it('registra o erro que não é Error pelo texto', async () => {
    const { service, media } = setup({
      expired: [{ id: 'ngo-1', animals: 0 }],
    });
    media.deleteNgoPrefix.mockRejectedValueOnce('bucket fora');

    await service.run();

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'NGO ngo-1 kept for the next run: bucket fora',
    );
  });

  describe('reset da conta demo (AD-008)', () => {
    it('soma os animais, objetos e bytes da conta demo no relatório e no log (DEP-28, DEP-30)', async () => {
      const log = vi.spyOn(Logger.prototype, 'log');
      const { service, demoAccount } = setup({
        expired: [{ id: 'ngo-1', animals: 2 }],
        demoReset: { animals: 4, objects: 8, bytes: 300 },
      });

      const report = await service.run();

      expect(demoAccount.reset).toHaveBeenCalledTimes(1);
      expect(report).toEqual({
        ngos: 1,
        animals: 6,
        objects: 14,
        bytes: 1300,
      });
      expect(log).toHaveBeenCalledWith({ event: 'cleanup', ...report });
    });

    it('sem demo fechada (reset null) o relatório não muda', async () => {
      const { service } = setup({ demoReset: null });

      expect(await service.run()).toEqual({
        ngos: 0,
        animals: 0,
        objects: 0,
        bytes: 0,
      });
    });

    it('bucket fora no reset: loga, segue a limpeza e não conta os animais (DEP-31)', async () => {
      const error = vi.spyOn(Logger.prototype, 'error');
      const { service, sessions } = setup({ demoReset: 'fails' });

      const report = await service.run();

      expect(report.animals).toBe(0);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('Demo account animals kept for the next run'),
      );
      expect(sessions.deleteExpired).toHaveBeenCalled();
    });
  });
});
