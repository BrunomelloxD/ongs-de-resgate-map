import { HttpException } from '@nestjs/common';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import { DemoQuotaService } from '@/modules/demo/services/demo-quota.service.js';
import { InMemoryObjectStorage } from '../../adapters/object-storage.js';
import {
  IImageProcessor,
  type ImageProfile,
  type ImageVariant,
  UnsupportedImage,
} from '../../adapters/sharp-image-processor.js';
import type {
  IMediaRepository,
  Tx,
} from '../../repositories/media.repository.interface.js';
import type { AnimalImage } from '@/generated/prisma/client.js';
import { ANIMAL_ID, makeAnimalImage, NGO_ID } from '../../test-fixtures.js';
import { MediaService } from '../media.service.js';

const MB = 1024 * 1024;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const DEMO = {
  enabled: true,
  retentionDays: 7,
  maxNgos: 30,
  signupsPerIpPerDay: 2,
  maxAnimalsPerNgo: 10,
  maxImagesPerAnimal: 3,
  maxUploadMb: 5,
  maxStorageMb: 500,
};

const ORIGINAL = Buffer.from('original-jpeg-with-exif');

function variant(size: number, width: number, height: number): ImageVariant {
  return { size, body: Buffer.from(`webp-${size}`), width, height };
}

const ANIMAL_VARIANTS = [variant(160, 160, 120), variant(1200, 1200, 900)];

interface Options {
  usedBytes?: number;
  processorError?: Error;
  ofNgo?: AnimalImage[];
  ofAnimal?: AnimalImage[];
  pending?: AnimalImage[];
  variants?: ImageVariant[];
  ngoImage?: { imageKey: string | null; imageBytes: number };
  publicImage?: AnimalImage | null;
  publicNgoImage?: boolean;
}

function setup(options: Options = {}) {
  const log: string[] = [];
  const tx = {
    $executeRaw: vi.fn((_: TemplateStringsArray, key: string) => {
      log.push(`lock ${key}`);
      return Promise.resolve(1);
    }),
    animalImage: {
      aggregate: vi.fn(() => {
        log.push('sum');
        return Promise.resolve({ _sum: { bytes: options.usedBytes ?? 0 } });
      }),
    },
    ngo: {
      aggregate: vi.fn(() => Promise.resolve({ _sum: { imageBytes: 0 } })),
    },
  };
  const txClient = tx as unknown as Tx;
  const state = { committed: false };

  const repository = {
    transaction: vi.fn(async (fn: (client: Tx) => Promise<unknown>) => {
      log.push('begin');
      const result = await fn(txClient);
      state.committed = true;
      return result;
    }),
    createPending: vi.fn((_tx: Tx, data: { id: string }) => {
      log.push('insert');
      return Promise.resolve(data);
    }),
    findByIdsOfNgo: vi.fn(() => Promise.resolve(options.ofNgo ?? [])),
    findByAnimal: vi.fn(() => Promise.resolve(options.ofAnimal ?? [])),
    savePositions: vi.fn(() => {
      log.push('positions');
      return Promise.resolve();
    }),
    deleteByIds: vi.fn(() => {
      log.push('delete rows');
      return Promise.resolve();
    }),
    findPendingOlderThan: vi.fn(() => Promise.resolve(options.pending ?? [])),
    deletePendingByIds: vi.fn(() => {
      log.push('delete rows');
      return Promise.resolve();
    }),
    findNgoImage: vi.fn(() =>
      Promise.resolve(options.ngoImage ?? { imageKey: null, imageBytes: 0 }),
    ),
    findPublicByKeyPrefix: vi.fn(() =>
      Promise.resolve(options.publicImage ?? null),
    ),
    hasPublicNgoImage: vi.fn(() =>
      Promise.resolve(options.publicNgoImage ?? false),
    ),
    updateNgoImage: vi.fn(() => {
      log.push('update ngo');
      return Promise.resolve();
    }),
  } satisfies Partial<Record<keyof IMediaRepository, unknown>>;

  const storage = new InMemoryObjectStorage();
  const put = vi.spyOn(storage, 'put');
  const deleteKeys = vi.spyOn(storage, 'deleteKeys');
  deleteKeys.mockImplementation(function (this: InMemoryObjectStorage, keys) {
    log.push('delete objects');
    return InMemoryObjectStorage.prototype.deleteKeys.call(this, keys);
  });
  const processor = {
    process: vi.fn((_buffer: Buffer, _profile: ImageProfile) => {
      log.push('process');
      return options.processorError
        ? Promise.reject(options.processorError)
        : Promise.resolve(options.variants ?? ANIMAL_VARIANTS);
    }),
  } satisfies IImageProcessor;
  const config = { demo: DEMO } as AppConfigService;
  const service = new MediaService(
    repository as unknown as IMediaRepository,
    storage,
    processor,
    new DemoQuotaService(config),
    config,
  );
  return {
    service,
    repository,
    storage,
    put,
    deleteKeys,
    processor,
    tx,
    txClient,
    log,
    state,
  };
}

/** Puts both variants of each image in the bucket. */
async function seedObjects(
  storage: InMemoryObjectStorage,
  images: readonly AnimalImage[],
) {
  for (const image of images) {
    await storage.put(`${image.keyPrefix}-160.webp`, Buffer.from('t'), 'x');
    await storage.put(`${image.keyPrefix}-1200.webp`, Buffer.from('l'), 'x');
  }
}

async function httpError(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(HttpException);
  const http = error as HttpException;
  return { status: http.getStatus(), message: http.message };
}

describe('MediaService.uploadAnimalImage', () => {
  it('grava a imagem PENDING e só as 2 variantes WebP, nunca o original (AFORM-12, SEC-07)', async () => {
    const { service, repository, storage, put } = setup();

    const result = await service.uploadAnimalImage(NGO_ID, {
      buffer: ORIGINAL,
      size: ORIGINAL.length,
    });

    expect(result.id).toMatch(UUID);
    const prefix = `ngos/${NGO_ID}/images/${result.id}`;
    expect(result).toEqual({
      id: result.id,
      thumbUrl: `/img/${prefix}-160.webp`,
      width: 1200,
      height: 900,
    });
    expect(storage.keys()).toEqual([
      `${prefix}-1200.webp`,
      `${prefix}-160.webp`,
    ]);
    expect(
      put.mock.calls.map(([key, body, type]) => [key, body, type]),
    ).toEqual([
      [`${prefix}-160.webp`, Buffer.from('webp-160'), 'image/webp'],
      [`${prefix}-1200.webp`, Buffer.from('webp-1200'), 'image/webp'],
    ]);
    expect(put.mock.calls.some(([, body]) => body.equals(ORIGINAL))).toBe(
      false,
    );
    expect(repository.createPending).toHaveBeenCalledWith(expect.anything(), {
      id: result.id,
      ngoId: NGO_ID,
      keyPrefix: prefix,
      bytes: 'webp-160'.length + 'webp-1200'.length,
      width: 1200,
      height: 900,
    });
  });

  it('converte antes da transação e soma os bytes sob o lock quota:storage (DEMO-12, DEMO-13)', async () => {
    const { service, processor, log } = setup();

    await service.uploadAnimalImage(NGO_ID, {
      buffer: ORIGINAL,
      size: ORIGINAL.length,
    });

    expect(processor.process).toHaveBeenCalledWith(ORIGINAL, 'animal');
    expect(log).toEqual([
      'process',
      'begin',
      'lock quota:storage',
      'sum',
      'insert',
    ]);
  });

  it('arquivo acima do limite → 413 "O arquivo passa de 5 MB." sem chamar o processador (DEMO-11)', async () => {
    const { service, processor, storage } = setup();

    const error = await httpError(
      service.uploadAnimalImage(NGO_ID, {
        buffer: ORIGINAL,
        size: 5 * MB + 1,
      }),
    );

    expect(error).toEqual({ status: 413, message: 'O arquivo passa de 5 MB.' });
    expect(processor.process).not.toHaveBeenCalled();
    expect(storage.keys()).toEqual([]);
  });

  it('arquivo de exatamente 5 MB é aceito', async () => {
    const { service, processor } = setup();

    await service.uploadAnimalImage(NGO_ID, {
      buffer: ORIGINAL,
      size: 5 * MB,
    });

    expect(processor.process).toHaveBeenCalledTimes(1);
  });

  it('tipo inválido → 400 "Envie JPG, PNG, WebP ou HEIC de até 5 MB." (AFORM-08)', async () => {
    const { service, repository, storage } = setup({
      processorError: new UnsupportedImage('gif'),
    });

    const error = await httpError(
      service.uploadAnimalImage(NGO_ID, {
        buffer: ORIGINAL,
        size: ORIGINAL.length,
      }),
    );

    expect(error).toEqual({
      status: 400,
      message: 'Envie JPG, PNG, WebP ou HEIC de até 5 MB.',
    });
    expect(repository.transaction).not.toHaveBeenCalled();
    expect(storage.keys()).toEqual([]);
  });

  it('sem arquivo → 400 com a mesma mensagem do AFORM-08', async () => {
    const { service, processor } = setup();

    const error = await httpError(service.uploadAnimalImage(NGO_ID, undefined));

    expect(error).toEqual({
      status: 400,
      message: 'Envie JPG, PNG, WebP ou HEIC de até 5 MB.',
    });
    expect(processor.process).not.toHaveBeenCalled();
  });

  it('erro inesperado do processador não vira 400', async () => {
    const failure = new Error('libvips crashed');
    const { service } = setup({ processorError: failure });

    await expect(
      service.uploadAnimalImage(NGO_ID, {
        buffer: ORIGINAL,
        size: ORIGINAL.length,
      }),
    ).rejects.toBe(failure);
  });

  it('armazenamento cheio → 409 com a mensagem do DEMO-12, sem gravar no bucket', async () => {
    // The two variants add 17 bytes, 1 byte above the 500 MB quota.
    const { service, repository, storage } = setup({
      usedBytes: 500 * MB - 16,
    });

    const error = await httpError(
      service.uploadAnimalImage(NGO_ID, {
        buffer: ORIGINAL,
        size: ORIGINAL.length,
      }),
    );

    expect(error).toEqual({
      status: 409,
      message:
        'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
    });
    expect(repository.createPending).not.toHaveBeenCalled();
    expect(storage.keys()).toEqual([]);
  });

  it('falha no bucket depois do insert desfaz a transação e não deixa variante solta', async () => {
    const { service, repository, storage, put, state } = setup();
    const failure = new Error('bucket down');
    put.mockImplementationOnce(InMemoryObjectStorage.prototype.put);
    put.mockRejectedValueOnce(failure);

    await expect(
      service.uploadAnimalImage(NGO_ID, {
        buffer: ORIGINAL,
        size: ORIGINAL.length,
      }),
    ).rejects.toBe(failure);

    expect(repository.createPending).toHaveBeenCalledTimes(1);
    expect(state.committed).toBe(false);
    expect(storage.keys()).toEqual([]);
  });
});

const A = makeAnimalImage({
  id: '00000000-0000-4000-8000-00000000000a',
  animalId: ANIMAL_ID,
  position: 0,
  bytes: 100,
});
const B = makeAnimalImage({
  id: '00000000-0000-4000-8000-00000000000b',
  animalId: ANIMAL_ID,
  position: 1,
  bytes: 200,
});
const C = makeAnimalImage({
  id: '00000000-0000-4000-8000-00000000000c',
  bytes: 300,
});
const D = makeAnimalImage({
  id: '00000000-0000-4000-8000-00000000000d',
  animalId: ANIMAL_ID,
  position: 2,
  bytes: 400,
});

describe('MediaService.attachToAnimal', () => {
  it('[c, a, b] grava a ordem c, a, b e apaga do banco e do bucket a foto que saiu (AFORM-10, AFORM-11, AFORM-14)', async () => {
    const { service, repository, storage, txClient, log } = setup({
      ofNgo: [A, B, C],
      ofAnimal: [A, B, D],
    });
    await seedObjects(storage, [A, B, C, D]);

    await service.attachToAnimal(txClient, NGO_ID, ANIMAL_ID, [
      C.id,
      A.id,
      B.id,
    ]);

    expect(repository.savePositions).toHaveBeenCalledWith(
      txClient,
      NGO_ID,
      ANIMAL_ID,
      [C.id, A.id, B.id],
    );
    expect(repository.deleteByIds).toHaveBeenCalledWith(txClient, NGO_ID, [
      D.id,
    ]);
    expect(storage.keys()).toEqual(
      [A, B, C]
        .flatMap(({ keyPrefix }) => [
          `${keyPrefix}-1200.webp`,
          `${keyPrefix}-160.webp`,
        ])
        .sort(),
    );
    // Bucket last: if it fails, the transaction rolls the rows back.
    expect(log).toEqual([
      `lock quota:images:${ANIMAL_ID}`,
      'delete rows',
      'positions',
      'delete objects',
    ]);
  });

  it('sem foto removida não apaga nada', async () => {
    const { service, repository, deleteKeys, txClient } = setup({
      ofNgo: [A, B],
      ofAnimal: [A, B],
    });

    await service.attachToAnimal(txClient, NGO_ID, ANIMAL_ID, [B.id, A.id]);

    expect(repository.deleteByIds).not.toHaveBeenCalled();
    expect(deleteKeys).not.toHaveBeenCalled();
    expect(repository.savePositions).toHaveBeenCalledWith(
      txClient,
      NGO_ID,
      ANIMAL_ID,
      [B.id, A.id],
    );
  });

  it('id repetido conta uma vez só', async () => {
    const { service, repository, txClient } = setup({ ofNgo: [A, B] });

    await service.attachToAnimal(txClient, NGO_ID, ANIMAL_ID, [
      A.id,
      B.id,
      A.id,
    ]);

    expect(repository.savePositions).toHaveBeenCalledWith(
      txClient,
      NGO_ID,
      ANIMAL_ID,
      [A.id, B.id],
    );
  });

  it('id de outra ONG → 404 sem gravar nada (SEC-06)', async () => {
    // The lookup filters by NGO, so the other NGO's photo is not returned.
    const { service, repository, txClient } = setup({ ofNgo: [A] });

    const error = await httpError(
      service.attachToAnimal(txClient, NGO_ID, ANIMAL_ID, [
        A.id,
        'f0000000-0000-4000-8000-000000000001',
      ]),
    );

    expect(error.status).toBe(404);
    expect(repository.findByIdsOfNgo).toHaveBeenCalledWith(txClient, NGO_ID, [
      A.id,
      'f0000000-0000-4000-8000-000000000001',
    ]);
    expect(repository.savePositions).not.toHaveBeenCalled();
  });

  it('foto já salva em outro animal → 404', async () => {
    const elsewhere = makeAnimalImage({
      id: '00000000-0000-4000-8000-0000000000ee',
      animalId: 'a0000000-0000-4000-8000-000000000099',
      position: 0,
    });
    const { service, repository, txClient } = setup({
      ofNgo: [A, elsewhere],
    });

    const error = await httpError(
      service.attachToAnimal(txClient, NGO_ID, ANIMAL_ID, [A.id, elsewhere.id]),
    );

    expect(error.status).toBe(404);
    expect(repository.savePositions).not.toHaveBeenCalled();
  });

  it('lista acima do limite → 409 "Este animal já tem o máximo de 3 fotos da demo." (DEMO-10)', async () => {
    const { service, repository, txClient } = setup({ ofNgo: [A, B, C, D] });

    const error = await httpError(
      service.attachToAnimal(txClient, NGO_ID, ANIMAL_ID, [
        A.id,
        B.id,
        C.id,
        D.id,
      ]),
    );

    expect(error).toEqual({
      status: 409,
      message: 'Este animal já tem o máximo de 3 fotos da demo.',
    });
    expect(repository.savePositions).not.toHaveBeenCalled();
  });

  it('lista vazia → 400 "Adicione pelo menos 1 foto." (AFORM-05)', async () => {
    const { service, repository, txClient } = setup();

    const error = await httpError(
      service.attachToAnimal(txClient, NGO_ID, ANIMAL_ID, []),
    );

    expect(error).toEqual({
      status: 400,
      message: 'Adicione pelo menos 1 foto.',
    });
    expect(repository.savePositions).not.toHaveBeenCalled();
  });

  it('bucket fora ao apagar a foto removida → 503 e a transação desfaz', async () => {
    const { service, deleteKeys, txClient } = setup({
      ofNgo: [A],
      ofAnimal: [A, D],
    });
    deleteKeys.mockRejectedValueOnce(new Error('bucket down'));

    const error = await httpError(
      service.attachToAnimal(txClient, NGO_ID, ANIMAL_ID, [A.id]),
    );

    expect(error).toEqual({
      status: 503,
      message: 'Não foi possível excluir agora. Tente de novo.',
    });
  });
});

describe('MediaService.deleteImages', () => {
  it('apaga do banco e do bucket todas as fotos do animal (AFORM-16)', async () => {
    const { service, repository, storage, txClient } = setup({
      ofAnimal: [A, B],
    });
    await seedObjects(storage, [A, B, C]);

    await service.deleteImages(txClient, NGO_ID, ANIMAL_ID);

    expect(repository.findByAnimal).toHaveBeenCalledWith(
      txClient,
      NGO_ID,
      ANIMAL_ID,
    );
    expect(repository.deleteByIds).toHaveBeenCalledWith(txClient, NGO_ID, [
      A.id,
      B.id,
    ]);
    expect(storage.keys()).toEqual([
      `${C.keyPrefix}-1200.webp`,
      `${C.keyPrefix}-160.webp`,
    ]);
  });

  it('bucket fora → 503', async () => {
    const { service, deleteKeys, txClient } = setup({ ofAnimal: [A] });
    deleteKeys.mockRejectedValueOnce(new Error('bucket down'));

    const error = await httpError(
      service.deleteImages(txClient, NGO_ID, ANIMAL_ID),
    );

    expect(error.status).toBe(503);
  });
});

describe('MediaService.deleteNgoPrefix', () => {
  it('apaga tudo sob ngos/{id}/ e devolve contagem e bytes (DEMO-14, PROF-08)', async () => {
    const { service, storage } = setup();
    await storage.put(
      `ngos/${NGO_ID}/images/x-160.webp`,
      Buffer.from('12'),
      'x',
    );
    await storage.put(
      `ngos/${NGO_ID}/logo/y-600.webp`,
      Buffer.from('345'),
      'x',
    );
    await storage.put('ngos/outra/images/z-160.webp', Buffer.from('6'), 'x');

    expect(await service.deleteNgoPrefix(NGO_ID)).toEqual({
      count: 2,
      bytes: 5,
    });
    expect(storage.keys()).toEqual(['ngos/outra/images/z-160.webp']);
  });

  it('bucket fora → 503', async () => {
    const { service, storage } = setup();
    vi.spyOn(storage, 'deletePrefix').mockRejectedValueOnce(new Error('down'));

    const error = await httpError(service.deleteNgoPrefix(NGO_ID));

    expect(error).toEqual({
      status: 503,
      message: 'Não foi possível excluir agora. Tente de novo.',
    });
  });
});

describe('MediaService.deletePendingOlderThan', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('deletePendingOlderThan(24) apaga os objetos antes das linhas e devolve contagem e bytes (DEMO-15)', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-21T12:00:00.000Z') });
    const old1 = makeAnimalImage({
      id: '00000000-0000-4000-8000-000000000001',
      bytes: 700,
    });
    const old2 = makeAnimalImage({
      id: '00000000-0000-4000-8000-000000000002',
      bytes: 50,
    });
    const { service, repository, storage, log } = setup({
      pending: [old1, old2],
    });
    await seedObjects(storage, [old1, old2, A]);

    const result = await service.deletePendingOlderThan(24);

    expect(result).toEqual({ count: 4, bytes: 750 });
    expect(repository.findPendingOlderThan).toHaveBeenCalledWith(
      new Date('2026-10-20T12:00:00.000Z'),
    );
    expect(repository.deletePendingByIds).toHaveBeenCalledWith([
      old1.id,
      old2.id,
    ]);
    expect(storage.keys()).toEqual([
      `${A.keyPrefix}-1200.webp`,
      `${A.keyPrefix}-160.webp`,
    ]);
    expect(log).toEqual(['delete objects', 'delete rows']);
  });

  it('bucket fora → as linhas ficam para a próxima execução (DEMO-17)', async () => {
    const { service, repository, deleteKeys } = setup({ pending: [C] });
    deleteKeys.mockRejectedValueOnce(new Error('bucket down'));

    const error = await httpError(service.deletePendingOlderThan(24));

    expect(error.status).toBe(503);
    expect(repository.deletePendingByIds).not.toHaveBeenCalled();
  });
});

describe('MediaService.uploadNgoImage', () => {
  const NGO_VARIANTS = [variant(160, 160, 160), variant(600, 600, 600)];
  const OLD = `ngos/${NGO_ID}/logo/00000000-0000-4000-8000-0000000000aa`;

  it('HEIC → 400 "Envie JPG, PNG ou WebP de até 5 MB." (SIGN-10)', async () => {
    const { service, processor, repository, storage } = setup({
      processorError: new UnsupportedImage('heic'),
    });

    const error = await httpError(
      service.uploadNgoImage(NGO_ID, {
        buffer: ORIGINAL,
        size: ORIGINAL.length,
      }),
    );

    expect(error).toEqual({
      status: 400,
      message: 'Envie JPG, PNG ou WebP de até 5 MB.',
    });
    expect(processor.process).toHaveBeenCalledWith(ORIGINAL, 'ngo');
    expect(repository.updateNgoImage).not.toHaveBeenCalled();
    expect(storage.keys()).toEqual([]);
  });

  it('grava as variantes quadradas 160 e 600 e atualiza imageKey e imageBytes (SIGN-09)', async () => {
    const { service, repository, storage, txClient, log } = setup({
      variants: NGO_VARIANTS,
    });

    const { imageKey } = await service.uploadNgoImage(NGO_ID, {
      buffer: ORIGINAL,
      size: ORIGINAL.length,
    });

    expect(imageKey).toMatch(new RegExp(`^ngos/${NGO_ID}/logo/[0-9a-f-]{36}$`));
    expect(storage.keys()).toEqual([
      `${imageKey}-160.webp`,
      `${imageKey}-600.webp`,
    ]);
    expect(repository.updateNgoImage).toHaveBeenCalledWith(txClient, NGO_ID, {
      imageKey,
      imageBytes: 'webp-160'.length + 'webp-600'.length,
    });
    expect(log).toEqual([
      'process',
      'begin',
      'lock quota:storage',
      'sum',
      'update ngo',
    ]);
  });

  it('troca de imagem apaga as variantes antigas', async () => {
    const { service, storage } = setup({
      variants: NGO_VARIANTS,
      ngoImage: { imageKey: OLD, imageBytes: 20 },
    });
    await storage.put(`${OLD}-160.webp`, Buffer.from('o'), 'x');
    await storage.put(`${OLD}-600.webp`, Buffer.from('o'), 'x');

    const { imageKey } = await service.uploadNgoImage(NGO_ID, {
      buffer: ORIGINAL,
      size: ORIGINAL.length,
    });

    expect(storage.keys()).toEqual([
      `${imageKey}-160.webp`,
      `${imageKey}-600.webp`,
    ]);
  });

  it('na troca, a cota desconta os bytes da imagem antiga (DEMO-12)', async () => {
    // 16 new bytes replace 20 old ones: the total drops, even at the limit.
    const { service, repository } = setup({
      variants: NGO_VARIANTS,
      ngoImage: { imageKey: OLD, imageBytes: 20 },
      usedBytes: 500 * MB,
    });

    await service.uploadNgoImage(NGO_ID, {
      buffer: ORIGINAL,
      size: ORIGINAL.length,
    });

    expect(repository.updateNgoImage).toHaveBeenCalledTimes(1);
  });

  it('falha ao apagar as variantes antigas não desfaz a troca', async () => {
    const { service, repository, deleteKeys, state } = setup({
      variants: NGO_VARIANTS,
      ngoImage: { imageKey: OLD, imageBytes: 20 },
    });
    deleteKeys.mockRejectedValueOnce(new Error('bucket down'));

    await service.uploadNgoImage(NGO_ID, {
      buffer: ORIGINAL,
      size: ORIGINAL.length,
    });

    expect(state.committed).toBe(true);
    expect(repository.updateNgoImage).toHaveBeenCalledTimes(1);
  });
});

describe('MediaService.getPublicImage', () => {
  const SAVED = makeAnimalImage({ animalId: ANIMAL_ID, position: 0 });
  const LOGO = `ngos/${NGO_ID}/logo/00000000-0000-4000-8000-0000000000aa`;

  async function body(stream: NodeJS.ReadableStream) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString();
  }

  it.each([160, 1200])(
    'foto salva de ONG ACTIVE, variante %i → stream do bucket (PERF-02)',
    async (size) => {
      const { service, repository, storage } = setup({ publicImage: SAVED });
      await storage.put(
        `${SAVED.keyPrefix}-${size}.webp`,
        Buffer.from(`v${size}`),
        'x',
      );

      const stream = await service.getPublicImage(
        `${SAVED.keyPrefix}-${size}.webp`,
      );

      expect(await body(stream)).toBe(`v${size}`);
      expect(repository.findPublicByKeyPrefix).toHaveBeenCalledWith(
        SAVED.keyPrefix,
      );
    },
  );

  it.each([160, 600])(
    'imagem atual de ONG ACTIVE, variante %i → stream do bucket',
    async (size) => {
      const { service, repository, storage } = setup({ publicNgoImage: true });
      await storage.put(`${LOGO}-${size}.webp`, Buffer.from('logo'), 'x');

      const stream = await service.getPublicImage(`${LOGO}-${size}.webp`);

      expect(await body(stream)).toBe('logo');
      expect(repository.hasPublicNgoImage).toHaveBeenCalledWith(LOGO);
    },
  );

  it('foto pendente ou de ONG que não está ACTIVE → 404 (SEC-06)', async () => {
    const { service, storage } = setup({ publicImage: null });
    await storage.put(`${SAVED.keyPrefix}-160.webp`, Buffer.from('x'), 'x');

    const error = await httpError(
      service.getPublicImage(`${SAVED.keyPrefix}-160.webp`),
    );

    expect(error.status).toBe(404);
  });

  it('imagem antiga ou de ONG que não está ACTIVE → 404', async () => {
    const { service } = setup({ publicNgoImage: false });

    const error = await httpError(service.getPublicImage(`${LOGO}-600.webp`));

    expect(error.status).toBe(404);
  });

  it.each([
    'ngos/x/images/y-160.webp',
    `${SAVED.keyPrefix}-160.png`,
    `${SAVED.keyPrefix}.webp`,
    `${SAVED.keyPrefix}-600.webp`,
    `${LOGO}-1200.webp`,
    `ngos/${NGO_ID}/outros/${SAVED.id}-160.webp`,
    `../ngos/${NGO_ID}/images/${SAVED.id}-160.webp`,
  ])('chave inválida "%s" → 404 sem consultar o banco', async (key) => {
    const { service, repository } = setup({
      publicImage: SAVED,
      publicNgoImage: true,
    });

    const error = await httpError(service.getPublicImage(key));

    expect(error.status).toBe(404);
    expect(repository.findPublicByKeyPrefix).not.toHaveBeenCalled();
    expect(repository.hasPublicNgoImage).not.toHaveBeenCalled();
  });

  it('linha confirmada sem o objeto no bucket → 404', async () => {
    const { service } = setup({ publicImage: SAVED });

    const error = await httpError(
      service.getPublicImage(`${SAVED.keyPrefix}-1200.webp`),
    );

    expect(error.status).toBe(404);
  });

  it('bucket fora não vira 404', async () => {
    const { service, storage } = setup({ publicImage: SAVED });
    const failure = new Error('bucket down');
    vi.spyOn(storage, 'getStream').mockRejectedValueOnce(failure);

    await expect(
      service.getPublicImage(`${SAVED.keyPrefix}-1200.webp`),
    ).rejects.toBe(failure);
  });
});
