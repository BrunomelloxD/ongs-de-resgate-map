import type { PrismaService } from '@/common/prisma/prisma.service.js';
import { CleanupRepository } from '../cleanup.repository.js';

const NOW = new Date('2026-10-20T12:00:00.000Z');

function setup() {
  const prisma = {
    ngo: { findMany: vi.fn(), deleteMany: vi.fn() },
    rateLimitHit: { deleteMany: vi.fn() },
    passwordReset: { deleteMany: vi.fn() },
  };
  return {
    prisma,
    repository: new CleanupRepository(prisma as unknown as PrismaService),
  };
}

describe('CleanupRepository', () => {
  it('findExpiredNgos busca só ONGs não seed com expiresAt vencido e conta os animais (DEMO-14, DEMO-19)', async () => {
    const { prisma, repository } = setup();
    prisma.ngo.findMany.mockResolvedValue([
      { id: 'a', _count: { animals: 4 } },
      { id: 'b', _count: { animals: 0 } },
    ]);

    const result = await repository.findExpiredNgos(NOW);

    expect(prisma.ngo.findMany).toHaveBeenCalledWith({
      where: { isSeed: false, expiresAt: { lt: NOW } },
      select: { id: true, _count: { select: { animals: true } } },
    });
    expect(result).toEqual([
      { id: 'a', animals: 4 },
      { id: 'b', animals: 0 },
    ]);
  });

  it('deleteNgo nunca apaga seed', async () => {
    const { prisma, repository } = setup();

    await repository.deleteNgo('a');

    expect(prisma.ngo.deleteMany).toHaveBeenCalledWith({
      where: { id: 'a', isSeed: false },
    });
  });

  it('deleteRateLimitHitsBefore devolve quantas linhas saíram', async () => {
    const { prisma, repository } = setup();
    prisma.rateLimitHit.deleteMany.mockResolvedValue({ count: 9 });

    expect(await repository.deleteRateLimitHitsBefore(NOW)).toBe(9);
    expect(prisma.rateLimitHit.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: NOW } },
    });
  });

  it('deleteExpiredPasswordResets apaga os links com expiresAt vencido', async () => {
    const { prisma, repository } = setup();
    prisma.passwordReset.deleteMany.mockResolvedValue({ count: 2 });

    expect(await repository.deleteExpiredPasswordResets(NOW)).toBe(2);
    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: NOW } },
    });
  });
});
