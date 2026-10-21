import type { PrismaService } from '@/common/prisma/prisma.service.js';
import { makeSession } from '../../test-fixtures.js';
import { SessionsRepository } from '../sessions.repository.js';

function setup() {
  const session = {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    deleteMany: vi.fn(),
  };
  const repository = new SessionsRepository({
    session,
  } as unknown as PrismaService);
  return { session, repository };
}

describe('SessionsRepository', () => {
  it('create grava a ONG e o hash do token', async () => {
    const { session, repository } = setup();
    const created = makeSession();
    session.create.mockResolvedValue(created);

    const result = await repository.create({
      ngoId: created.ngoId,
      tokenHash: created.tokenHash,
    });

    expect(result).toBe(created);
    expect(session.create).toHaveBeenCalledWith({
      data: { ngoId: created.ngoId, tokenHash: created.tokenHash },
    });
  });

  it('findByTokenHash busca pelo hash e devolve null quando não existe', async () => {
    const { session, repository } = setup();
    const found = makeSession();
    session.findUnique.mockResolvedValueOnce(found).mockResolvedValueOnce(null);

    expect(await repository.findByTokenHash('b'.repeat(64))).toBe(found);
    expect(await repository.findByTokenHash('c'.repeat(64))).toBeNull();
    expect(session.findUnique).toHaveBeenNthCalledWith(1, {
      where: { tokenHash: 'b'.repeat(64) },
    });
  });

  it('touch grava o novo lastUsedAt só na sessão do id', async () => {
    const { session, repository } = setup();
    const at = new Date('2026-10-21T08:30:00.000Z');

    await repository.touch('s-1', at);

    expect(session.updateMany).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: { lastUsedAt: at },
    });
  });

  it('delete apaga só a sessão do id (AUTH-05)', async () => {
    const { session, repository } = setup();
    session.deleteMany.mockResolvedValue({ count: 1 });

    await repository.delete('s-1');

    expect(session.deleteMany).toHaveBeenCalledWith({ where: { id: 's-1' } });
  });

  it('deleteAllOf apaga todas as sessões da ONG (AUTH-12)', async () => {
    const { session, repository } = setup();
    session.deleteMany.mockResolvedValue({ count: 3 });

    expect(await repository.deleteAllOf('ngo-1')).toBe(3);
    expect(session.deleteMany).toHaveBeenCalledWith({
      where: { ngoId: 'ngo-1' },
    });
  });

  it('deleteAllOf mantém a sessão informada (PROF-05)', async () => {
    const { session, repository } = setup();
    session.deleteMany.mockResolvedValue({ count: 2 });

    expect(await repository.deleteAllOf('ngo-1', 's-atual')).toBe(2);
    expect(session.deleteMany).toHaveBeenCalledWith({
      where: { ngoId: 'ngo-1', id: { not: 's-atual' } },
    });
  });

  it('deleteExpired apaga as sessões sem uso desde a data informada', async () => {
    const { session, repository } = setup();
    session.deleteMany.mockResolvedValue({ count: 4 });
    const before = new Date('2026-10-13T12:00:00.000Z');

    expect(await repository.deleteExpired(before)).toBe(4);
    expect(session.deleteMany).toHaveBeenCalledWith({
      where: { lastUsedAt: { lt: before } },
    });
  });
});
