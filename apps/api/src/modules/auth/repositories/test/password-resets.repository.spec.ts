import type { PrismaService } from '@/common/prisma/prisma.service.js';
import { PasswordResetsRepository } from '../password-resets.repository.js';

const ID = '7c1c2f4e-3b0a-4f7e-9d1a-0b6f5e2a9c11';
const NGO_ID = 'b3f1d6a2-8c4e-4a7b-9f0d-2e5c6a1b7d33';
const HASH = 'a'.repeat(64);

function setup() {
  const passwordReset = {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  };
  const repository = new PasswordResetsRepository({
    passwordReset,
  } as unknown as PrismaService);
  return { passwordReset, repository };
}

describe('PasswordResetsRepository', () => {
  it('create grava o hash do token e a validade', async () => {
    const { passwordReset, repository } = setup();
    const data = {
      ngoId: NGO_ID,
      tokenHash: HASH,
      expiresAt: new Date('2026-10-20T13:00:00.000Z'),
    };

    await repository.create(data);

    expect(passwordReset.create).toHaveBeenCalledWith({ data });
  });

  it('findByTokenHash busca pelo hash', async () => {
    const { passwordReset, repository } = setup();
    passwordReset.findUnique.mockResolvedValue(null);

    expect(await repository.findByTokenHash(HASH)).toBeNull();
    expect(passwordReset.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: HASH },
    });
  });

  it('markUsed só marca o link ainda não usado (AUTH-13)', async () => {
    const { passwordReset, repository } = setup();
    const usedAt = new Date('2026-10-20T12:30:00.000Z');
    passwordReset.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    expect(await repository.markUsed(ID, usedAt)).toBe(true);
    expect(await repository.markUsed(ID, usedAt)).toBe(false);
    expect(passwordReset.updateMany).toHaveBeenCalledWith({
      where: { id: ID, usedAt: null },
      data: { usedAt },
    });
  });
});
