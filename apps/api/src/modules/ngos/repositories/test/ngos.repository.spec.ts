import type { PrismaService } from '@/common/prisma/prisma.service.js';
import type { Prisma } from '@/generated/prisma/client.js';
import { makeNgo, NGO_ID, weekHours } from '../../test-fixtures.js';
import type { Tx } from '../ngos.repository.interface.js';
import { NgosRepository } from '../ngos.repository.js';

// Halves that are exact in binary, so the center compares with toEqual.
const BBOX = { minLng: -46.75, minLat: -23.75, maxLng: -46.25, maxLat: -23.25 };
const WITH_HOURS = { openingHours: { orderBy: { dayOfWeek: 'asc' } } };

function setup() {
  const ngo = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const animal = {
    findMany: vi.fn((_args: unknown) => 'findMany-query'),
    count: vi.fn((_args: unknown) => 'count-query'),
  };
  const tx = { ngo: { create: vi.fn(), findMany: vi.fn() } };
  const prisma = {
    ngo,
    animal,
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  const repository = new NgosRepository(prisma as unknown as PrismaService);
  return { prisma, ngo, animal, tx, txClient: tx as unknown as Tx, repository };
}

/** The SQL sent to $queryRaw, with its bound values. */
function sentQuery(prisma: ReturnType<typeof setup>['prisma']): Prisma.Sql {
  return prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
}

describe('NgosRepository', () => {
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

  describe('searchByBbox', () => {
    it('só ONGs ACTIVE dentro da bbox, ordenadas pelo centro, com LIMIT 201 (MAP-02, MAP-18)', async () => {
      const { prisma, ngo, repository } = setup();
      prisma.$queryRaw.mockResolvedValue([]);
      ngo.findMany.mockResolvedValue([]);

      await repository.searchByBbox(BBOX, []);

      const query = sentQuery(prisma);
      expect(query.sql).toContain("n.status = 'ACTIVE'");
      expect(query.sql).toContain('n.lat BETWEEN');
      expect(query.sql).toContain('n.lng BETWEEN');
      expect(query.sql).not.toContain('EXISTS');
      // minLat, maxLat, minLng, maxLng, center lat, center lng, center lat, limit
      expect(query.values).toEqual([
        -23.75, -23.25, -46.75, -46.25, -23.5, -46.5, -23.5, 201,
      ]);
      expect(ngo.findMany).toHaveBeenCalledWith({
        where: { id: { in: [] }, status: 'ACTIVE' },
        include: WITH_HOURS,
      });
    });

    it('espécies DOG e CAT viram um único EXISTS com animal disponível de qualquer uma (MAPF-03)', async () => {
      const { prisma, ngo, repository } = setup();
      prisma.$queryRaw.mockResolvedValue([]);
      ngo.findMany.mockResolvedValue([]);

      await repository.searchByBbox(BBOX, ['DOG', 'CAT']);

      const query = sentQuery(prisma);
      expect(query.sql).toContain('EXISTS');
      expect(query.sql).toContain('a.available');
      expect(query.sql).toContain('a.species::text = ANY(');
      expect(query.values).toContainEqual(['DOG', 'CAT']);
      expect(query.values.at(-1)).toBe(201);
    });

    it('devolve as ONGs na ordem do SQL, com os horários', async () => {
      const { prisma, ngo, repository } = setup();
      const near = makeNgo({ id: 'near' });
      const far = makeNgo({ id: 'far' });
      prisma.$queryRaw.mockResolvedValue([{ id: 'near' }, { id: 'far' }]);
      ngo.findMany.mockResolvedValue([far, near]);

      const result = await repository.searchByBbox(BBOX, []);

      expect(result).toEqual({ items: [near, far], truncated: false });
      expect(ngo.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['near', 'far'] }, status: 'ACTIVE' },
        include: WITH_HOURS,
      });
    });

    it('201 linhas → 200 itens e truncated: true (MAP-18)', async () => {
      const { prisma, ngo, repository } = setup();
      const rows = Array.from({ length: 201 }, (_, i) => ({ id: `ngo-${i}` }));
      prisma.$queryRaw.mockResolvedValue(rows);
      ngo.findMany.mockImplementation(
        ({ where }: { where: { id: { in: string[] } } }) =>
          Promise.resolve(where.id.in.map((id) => makeNgo({ id }))),
      );

      const result = await repository.searchByBbox(BBOX, []);

      expect(result.truncated).toBe(true);
      expect(result.items).toHaveLength(200);
      expect(result.items.at(-1)?.id).toBe('ngo-199');
    });

    it('ONG que deixou de estar ACTIVE entre as duas consultas fica de fora', async () => {
      const { prisma, ngo, repository } = setup();
      const kept = makeNgo({ id: 'kept' });
      prisma.$queryRaw.mockResolvedValue([{ id: 'gone' }, { id: 'kept' }]);
      ngo.findMany.mockResolvedValue([kept]);

      const result = await repository.searchByBbox(BBOX, []);

      expect(result.items).toEqual([kept]);
    });
  });

  it('findActiveBySlug filtra status ACTIVE e conta os animais (NGO-11)', async () => {
    const { ngo, repository } = setup();
    const found = { ...makeNgo(), _count: { animals: 2 } };
    ngo.findFirst.mockResolvedValue(found);

    expect(await repository.findActiveBySlug('patas-do-bairro')).toBe(found);
    expect(ngo.findFirst).toHaveBeenCalledWith({
      where: { slug: 'patas-do-bairro', status: 'ACTIVE' },
      include: { ...WITH_HOURS, _count: { select: { animals: true } } },
    });
  });

  describe('findAnimals', () => {
    it('só disponíveis, com espécie, sexo e porte combinados e a capa (NGO-05, NGO-06, ANI-02)', async () => {
      const { prisma, animal, repository } = setup();
      prisma.$transaction.mockResolvedValue([['animal'], 13]);

      const result = await repository.findAnimals(
        NGO_ID,
        { species: 'CAT', sex: 'FEMALE', size: 'SMALL', available: true },
        { skip: 12, take: 12 },
      );

      const where = {
        ngoId: NGO_ID,
        species: 'CAT',
        sex: 'FEMALE',
        size: 'SMALL',
        available: true,
      };
      expect(result).toEqual({ items: ['animal'], total: 13 });
      expect(animal.findMany).toHaveBeenCalledWith({
        where,
        include: { images: { where: { position: 0 } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 12,
        take: 12,
      });
      expect(animal.count).toHaveBeenCalledWith({ where });
      expect(prisma.$transaction).toHaveBeenCalledWith([
        'findMany-query',
        'count-query',
      ]);
    });

    it('available: false não filtra a disponibilidade (NGO-07)', async () => {
      const { prisma, animal, repository } = setup();
      prisma.$transaction.mockResolvedValue([[], 0]);

      await repository.findAnimals(
        NGO_ID,
        { available: false },
        { skip: 0, take: 12 },
      );

      const { where } = animal.count.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(where).not.toHaveProperty('available');
      expect(where.ngoId).toBe(NGO_ID);
    });
  });

  it('create insere a ONG com os 7 horários na transação (SIGN-28)', async () => {
    const { tx, txClient, ngo, repository } = setup();
    const created = makeNgo();
    tx.ngo.create.mockResolvedValue(created);
    const data = { legalName: 'Patas do Bairro' } as never;
    const hours = weekHours().map((day) => ({ ...day, id: 'x', ngoId: 'y' }));

    expect(await repository.create(txClient, data, hours)).toBe(created);
    expect(tx.ngo.create).toHaveBeenCalledWith({
      data: {
        legalName: 'Patas do Bairro',
        openingHours: { create: weekHours() },
      },
      include: WITH_HOURS,
    });
    expect(ngo.findMany).not.toHaveBeenCalled();
  });

  it('findSlugsStartingWith devolve os slugs que começam com a base (SIGN-29)', async () => {
    const { tx, txClient, repository } = setup();
    tx.ngo.findMany.mockResolvedValue([{ slug: 'patas' }, { slug: 'patas-2' }]);

    expect(await repository.findSlugsStartingWith(txClient, 'patas')).toEqual([
      'patas',
      'patas-2',
    ]);
    expect(tx.ngo.findMany).toHaveBeenCalledWith({
      where: { slug: { startsWith: 'patas' } },
      select: { slug: true },
    });
  });

  it('findBySignupRequestId busca pelo id do envio (SIGN-32)', async () => {
    const { ngo, repository } = setup();
    ngo.findUnique.mockResolvedValue(null);

    expect(await repository.findBySignupRequestId('req-1')).toBeNull();
    expect(ngo.findUnique).toHaveBeenCalledWith({
      where: { signupRequestId: 'req-1' },
      include: WITH_HOURS,
    });
  });

  it('findByEmail busca pelo e-mail', async () => {
    const { ngo, repository } = setup();
    const found = makeNgo();
    ngo.findUnique.mockResolvedValue(found);

    expect(await repository.findByEmail('contato@patas.org')).toBe(found);
    expect(ngo.findUnique).toHaveBeenCalledWith({
      where: { email: 'contato@patas.org' },
    });
  });

  it.each([
    [1, true],
    [0, false],
  ])(
    'existsByCnpj e existsByEmail: %i ONG com o valor → %s (SIGN-05, SIGN-12)',
    async (count, expected) => {
      const { ngo, repository } = setup();
      ngo.count.mockResolvedValue(count);

      expect(await repository.existsByCnpj('11222333000181')).toBe(expected);
      expect(await repository.existsByEmail('contato@patas.org')).toBe(
        expected,
      );
      expect(ngo.count).toHaveBeenNthCalledWith(1, {
        where: { cnpj: '11222333000181' },
      });
      expect(ngo.count).toHaveBeenNthCalledWith(2, {
        where: { email: 'contato@patas.org' },
      });
    },
  );

  it('findById busca com os horários', async () => {
    const { ngo, repository } = setup();
    const found = makeNgo();
    ngo.findUnique.mockResolvedValue(found);

    expect(await repository.findById(NGO_ID)).toBe(found);
    expect(ngo.findUnique).toHaveBeenCalledWith({
      where: { id: NGO_ID },
      include: WITH_HOURS,
    });
  });

  it('update com horários troca os 7 dias no mesmo comando', async () => {
    const { ngo, repository } = setup();
    const updated = makeNgo();
    ngo.update.mockResolvedValue(updated);
    const [sunday] = weekHours();

    expect(await repository.update(NGO_ID, { city: 'Manaus' }, [sunday])).toBe(
      updated,
    );
    expect(ngo.update).toHaveBeenCalledWith({
      where: { id: NGO_ID },
      data: {
        city: 'Manaus',
        openingHours: {
          upsert: [
            {
              where: { ngoId_dayOfWeek: { ngoId: NGO_ID, dayOfWeek: 0 } },
              create: sunday,
              update: sunday,
            },
          ],
        },
      },
      include: WITH_HOURS,
    });
  });

  it('update sem horários não mexe nos dias', async () => {
    const { ngo, repository } = setup();
    ngo.update.mockResolvedValue(makeNgo());

    await repository.update(NGO_ID, { city: 'Manaus' });

    expect(ngo.update).toHaveBeenCalledWith({
      where: { id: NGO_ID },
      data: { city: 'Manaus', openingHours: undefined },
      include: WITH_HOURS,
    });
  });

  it('delete apaga a ONG pelo id', async () => {
    const { ngo, repository } = setup();
    ngo.delete.mockResolvedValue(makeNgo());

    await repository.delete(NGO_ID);

    expect(ngo.delete).toHaveBeenCalledWith({ where: { id: NGO_ID } });
  });
});
