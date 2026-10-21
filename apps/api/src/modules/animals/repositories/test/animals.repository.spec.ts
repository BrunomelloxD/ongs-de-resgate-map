import type { PrismaService } from '@/common/prisma/prisma.service.js';
import type { Prisma } from '@/generated/prisma/client.js';
import { ANIMAL_ID, makeAnimal, NGO_ID } from '../../test-fixtures.js';
import type { Tx } from '../animals.repository.interface.js';
import { AnimalsRepository, likePattern } from '../animals.repository.js';

const WITH_IMAGES = { images: { orderBy: { position: 'asc' } } };
const ORDER = [{ createdAt: 'desc' }, { id: 'asc' }];
const DATA = {
  name: 'Mel',
  species: 'CAT',
  breed: null,
  sex: 'FEMALE',
  size: 'SMALL',
  ageValue: 2,
  ageUnit: 'YEARS',
  description: null,
} as const;

function setup() {
  const animal = { findFirst: vi.fn(), findMany: vi.fn() };
  const prisma = { animal, $queryRaw: vi.fn(), $transaction: vi.fn() };
  const tx = {
    animal: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  const repository = new AnimalsRepository(prisma as unknown as PrismaService);
  return { prisma, animal, tx, txClient: tx as unknown as Tx, repository };
}

describe('AnimalsRepository', () => {
  it('transaction roda a função com o client da transação', async () => {
    const { prisma, txClient, repository } = setup();
    prisma.$transaction.mockImplementation((fn: (tx: Tx) => unknown) =>
      fn(txClient),
    );

    const result = await repository.transaction((client) => {
      expect(client).toBe(txClient);
      return Promise.resolve('ok');
    });

    expect(result).toBe('ok');
  });

  it('findPublicById só acha animal de ONG ACTIVE, com fotos em ordem e a ONG (ANI-06)', async () => {
    const { animal, repository } = setup();
    const record = makeAnimal();
    animal.findFirst.mockResolvedValue(record);

    expect(await repository.findPublicById(ANIMAL_ID)).toBe(record);
    expect(animal.findFirst).toHaveBeenCalledWith({
      where: { id: ANIMAL_ID, ngo: { status: 'ACTIVE' } },
      include: { ...WITH_IMAGES, ngo: true },
    });
  });

  describe('findAllOfNgo', () => {
    it.each([
      ['all', {}],
      ['dogs', { species: 'DOG' }],
      ['cats', { species: 'CAT' }],
      ['available', { available: true }],
      ['unavailable', { available: false }],
    ] as const)(
      'filtro %s → só animais da ONG que atendem a ele (DASH-05)',
      async (filter, expected) => {
        const { prisma, animal, repository } = setup();
        animal.findMany.mockResolvedValue([]);

        await repository.findAllOfNgo(NGO_ID, { filter });

        expect(prisma.$queryRaw).not.toHaveBeenCalled();
        expect(animal.findMany).toHaveBeenCalledWith({
          where: { ngoId: NGO_ID, ...expected },
          include: WITH_IMAGES,
          orderBy: ORDER,
        });
      },
    );

    it('busca com unaccent + ILIKE na ONG e filtra pelos ids achados (DASH-04)', async () => {
      const { prisma, animal, repository } = setup();
      const found = [makeAnimal()];
      prisma.$queryRaw.mockResolvedValue([{ id: ANIMAL_ID }]);
      animal.findMany.mockResolvedValue(found);

      const result = await repository.findAllOfNgo(NGO_ID, {
        search: 'joao',
        filter: 'dogs',
      });

      expect(result).toBe(found);
      const query = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      expect(query.sql).toContain('ngo_id = ?');
      expect(query.sql).toContain('unaccent(name) ILIKE unaccent(?)');
      expect(query.values).toEqual([NGO_ID, '%joao%']);
      expect(animal.findMany).toHaveBeenCalledWith({
        where: { ngoId: NGO_ID, species: 'DOG', id: { in: [ANIMAL_ID] } },
        include: WITH_IMAGES,
        orderBy: ORDER,
      });
    });

    it('busca sem resultado no SQL → lista vazia de ids', async () => {
      const { prisma, animal, repository } = setup();
      prisma.$queryRaw.mockResolvedValue([]);
      animal.findMany.mockResolvedValue([]);

      await repository.findAllOfNgo(NGO_ID, { search: 'x', filter: 'all' });

      expect(animal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ngoId: NGO_ID, id: { in: [] } } }),
      );
    });
  });

  it('likePattern escapa %, _ e \\ digitados pela ONG', () => {
    expect(likePattern('Mel')).toBe('%Mel%');
    expect(likePattern('50%_a\\b')).toBe('%50\\%\\_a\\\\b%');
  });

  it('findOwn filtra por id e ngoId, com as fotos em ordem (SEC-06)', async () => {
    const { tx, txClient, repository } = setup();
    tx.animal.findFirst.mockResolvedValue(null);

    expect(await repository.findOwn(txClient, NGO_ID, ANIMAL_ID)).toBeNull();
    expect(tx.animal.findFirst).toHaveBeenCalledWith({
      where: { id: ANIMAL_ID, ngoId: NGO_ID },
      include: WITH_IMAGES,
    });
  });

  it('create grava pela transação', async () => {
    const { tx, txClient, repository } = setup();
    const created = makeAnimal();
    tx.animal.create.mockResolvedValue(created);
    const data = { ...DATA, ngoId: NGO_ID, available: true };

    expect(await repository.create(txClient, data)).toBe(created);
    expect(tx.animal.create).toHaveBeenCalledWith({ data });
  });

  it('update filtra por id e ngoId (SEC-06)', async () => {
    const { tx, txClient, repository } = setup();
    const changedAt = new Date('2026-10-21T10:00:00.000Z');
    tx.animal.update.mockResolvedValue(makeAnimal());

    await repository.update(txClient, NGO_ID, ANIMAL_ID, {
      available: false,
      availableChangedAt: changedAt,
    });

    expect(tx.animal.update).toHaveBeenCalledWith({
      where: { id: ANIMAL_ID, ngoId: NGO_ID },
      data: { available: false, availableChangedAt: changedAt },
    });
  });

  it('delete filtra por id e ngoId (SEC-06)', async () => {
    const { tx, txClient, repository } = setup();
    tx.animal.delete.mockResolvedValue(makeAnimal());

    await repository.delete(txClient, NGO_ID, ANIMAL_ID);

    expect(tx.animal.delete).toHaveBeenCalledWith({
      where: { id: ANIMAL_ID, ngoId: NGO_ID },
    });
  });
});
