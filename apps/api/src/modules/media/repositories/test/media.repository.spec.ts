import type { PrismaService } from '@/common/prisma/prisma.service.js';
import { ANIMAL_ID, makeAnimalImage, NGO_ID } from '../../test-fixtures.js';
import type { Tx } from '../media.repository.interface.js';
import { MediaRepository } from '../media.repository.js';

function imageDelegate() {
  return {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
  };
}

function setup() {
  const animalImage = imageDelegate();
  const ngo = { aggregate: vi.fn(), count: vi.fn() };
  const tx = {
    animalImage: imageDelegate(),
    ngo: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  };
  const prisma = {
    animalImage,
    ngo,
    $transaction: vi.fn((fn: (client: unknown) => unknown) => fn(tx)),
  };
  const repository = new MediaRepository(prisma as unknown as PrismaService);
  return {
    prisma,
    animalImage,
    ngo,
    tx,
    txClient: tx as unknown as Tx,
    repository,
  };
}

describe('MediaRepository', () => {
  it('transaction roda a função com o client da transação', async () => {
    const { prisma, txClient, repository } = setup();

    const result = await repository.transaction((client) => {
      expect(client).toBe(txClient);
      return Promise.resolve('ok');
    });

    expect(result).toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('createPending insere a imagem sem animal e sem posição, na transação', async () => {
    const { tx, txClient, animalImage, repository } = setup();
    const created = makeAnimalImage();
    tx.animalImage.create.mockResolvedValue(created);
    const data = {
      id: created.id,
      ngoId: NGO_ID,
      keyPrefix: created.keyPrefix,
      bytes: 120_000,
      width: 1200,
      height: 900,
    };

    expect(await repository.createPending(txClient, data)).toBe(created);
    expect(tx.animalImage.create).toHaveBeenCalledWith({ data });
    expect(animalImage.create).not.toHaveBeenCalled();
  });

  it('sumBytes soma as fotos dos animais e as imagens das ONGs (DEMO-12)', async () => {
    const { animalImage, ngo, repository } = setup();
    animalImage.aggregate.mockResolvedValue({ _sum: { bytes: 300 } });
    ngo.aggregate.mockResolvedValue({ _sum: { imageBytes: 45 } });

    expect(await repository.sumBytes()).toBe(345);
    expect(animalImage.aggregate).toHaveBeenCalledWith({
      _sum: { bytes: true },
    });
    expect(ngo.aggregate).toHaveBeenCalledWith({ _sum: { imageBytes: true } });
  });

  it('sumBytes devolve 0 sem nenhuma imagem', async () => {
    const { animalImage, ngo, repository } = setup();
    animalImage.aggregate.mockResolvedValue({ _sum: { bytes: null } });
    ngo.aggregate.mockResolvedValue({ _sum: { imageBytes: null } });

    expect(await repository.sumBytes()).toBe(0);
  });

  it('countByAnimal conta as fotos do animal só dentro da ONG', async () => {
    const { animalImage, repository } = setup();
    animalImage.count.mockResolvedValue(3);

    expect(await repository.countByAnimal(NGO_ID, ANIMAL_ID)).toBe(3);
    expect(animalImage.count).toHaveBeenCalledWith({
      where: { ngoId: NGO_ID, animalId: ANIMAL_ID },
    });
  });

  it('findByIdsOfNgo busca os ids só dentro da ONG (SEC-06)', async () => {
    const { tx, txClient, repository } = setup();
    const found = [makeAnimalImage()];
    tx.animalImage.findMany.mockResolvedValue(found);

    expect(await repository.findByIdsOfNgo(txClient, NGO_ID, ['a', 'b'])).toBe(
      found,
    );
    expect(tx.animalImage.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] }, ngoId: NGO_ID },
    });
  });

  it('findByAnimal busca as fotos do animal só dentro da ONG (SEC-06)', async () => {
    const { tx, txClient, repository } = setup();
    const found = [makeAnimalImage({ animalId: ANIMAL_ID, position: 0 })];
    tx.animalImage.findMany.mockResolvedValue(found);

    expect(await repository.findByAnimal(txClient, NGO_ID, ANIMAL_ID)).toBe(
      found,
    );
    expect(tx.animalImage.findMany).toHaveBeenCalledWith({
      where: { ngoId: NGO_ID, animalId: ANIMAL_ID },
    });
  });

  it('savePositions grava 0, 1, 2 na ordem da lista, passando antes por posições negativas', async () => {
    const { tx, txClient, repository } = setup();

    await repository.savePositions(txClient, NGO_ID, ANIMAL_ID, [
      'c',
      'a',
      'b',
    ]);

    const calls = tx.animalImage.update.mock.calls.map(([args]) => args);
    const write = (id: string, position: number) => ({
      where: { id, ngoId: NGO_ID },
      data: { animalId: ANIMAL_ID, position },
    });
    // The negative phase avoids clashing with @@unique([animalId, position]).
    expect(calls).toEqual([
      write('c', -1),
      write('a', -2),
      write('b', -3),
      write('c', 0),
      write('a', 1),
      write('b', 2),
    ]);
  });

  it('deleteByIds apaga os ids só dentro da ONG (SEC-06)', async () => {
    const { tx, txClient, repository } = setup();
    tx.animalImage.deleteMany.mockResolvedValue({ count: 2 });

    await repository.deleteByIds(txClient, NGO_ID, ['a', 'b']);

    expect(tx.animalImage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] }, ngoId: NGO_ID },
    });
  });

  it('findPendingOlderThan lista as pendentes criadas antes da data (DEMO-15)', async () => {
    const { animalImage, repository } = setup();
    const found = [makeAnimalImage()];
    animalImage.findMany.mockResolvedValue(found);
    const before = new Date('2026-10-19T12:00:00.000Z');

    expect(await repository.findPendingOlderThan(before)).toBe(found);
    expect(animalImage.findMany).toHaveBeenCalledWith({
      where: { animalId: null, createdAt: { lt: before } },
    });
  });

  it('deletePendingByIds apaga só as linhas que continuam pendentes', async () => {
    const { animalImage, repository } = setup();
    animalImage.deleteMany.mockResolvedValue({ count: 1 });

    await repository.deletePendingByIds(['a', 'b']);

    expect(animalImage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] }, animalId: null },
    });
  });

  it('findPublicByKeyPrefix acha só foto salva de ONG ACTIVE (SEC-06)', async () => {
    const { animalImage, repository } = setup();
    const found = makeAnimalImage({ animalId: ANIMAL_ID, position: 0 });
    animalImage.findFirst
      .mockResolvedValueOnce(found)
      .mockResolvedValueOnce(null);

    expect(await repository.findPublicByKeyPrefix(found.keyPrefix)).toBe(found);
    expect(
      await repository.findPublicByKeyPrefix('ngos/x/images/y'),
    ).toBeNull();
    expect(animalImage.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        keyPrefix: found.keyPrefix,
        animalId: { not: null },
        ngo: { status: 'ACTIVE' },
      },
    });
  });

  it('findNgoImage lê a chave e os bytes da imagem atual da ONG', async () => {
    const { tx, txClient, repository } = setup();
    const current = { imageKey: `ngos/${NGO_ID}/logo/old`, imageBytes: 900 };
    tx.ngo.findUniqueOrThrow.mockResolvedValue(current);

    expect(await repository.findNgoImage(txClient, NGO_ID)).toBe(current);
    expect(tx.ngo.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: NGO_ID },
      select: { imageKey: true, imageBytes: true },
    });
  });

  it('updateNgoImage grava a nova chave e os bytes na ONG (SIGN-09, DEMO-12)', async () => {
    const { tx, txClient, repository } = setup();
    const image = { imageKey: `ngos/${NGO_ID}/logo/new`, imageBytes: 1234 };

    await repository.updateNgoImage(txClient, NGO_ID, image);

    expect(tx.ngo.update).toHaveBeenCalledWith({
      where: { id: NGO_ID },
      data: image,
    });
  });

  it('hasPublicNgoImage só aceita a imagem atual de ONG ACTIVE (SEC-06)', async () => {
    const { ngo, repository } = setup();
    ngo.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const key = `ngos/${NGO_ID}/logo/abc`;

    expect(await repository.hasPublicNgoImage(key)).toBe(true);
    expect(await repository.hasPublicNgoImage(key)).toBe(false);
    expect(ngo.count).toHaveBeenCalledWith({
      where: { imageKey: key, status: 'ACTIVE' },
    });
  });
});
