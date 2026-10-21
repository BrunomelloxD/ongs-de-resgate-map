import { HttpException } from '@nestjs/common';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import { DemoQuotaService } from '../demo-quota.service.js';

const MB = 1024 * 1024;
const NOW = new Date('2026-10-20T12:00:00.000Z');

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

interface Usage {
  activeNgos?: number;
  signupsFromIp?: number;
  animals?: number;
  imageBytes?: number | null;
  logoBytes?: number | null;
}

/** Transaction stand-in that logs the order of the lock and the queries. */
function fakeTx(usage: Usage = {}) {
  const log: string[] = [];
  const tx = {
    $executeRaw: vi.fn((strings: TemplateStringsArray, key: string) => {
      log.push(`lock ${key}`);
      expect(strings.join('?')).toBe(
        'SELECT pg_advisory_xact_lock(hashtext(?))',
      );
      return Promise.resolve(1);
    }),
    ngo: {
      count: vi.fn(({ where }: { where: { signupIpHash?: string } }) => {
        const ip = where.signupIpHash !== undefined;
        log.push(ip ? 'count signups' : 'count ngos');
        return Promise.resolve(
          ip ? (usage.signupsFromIp ?? 0) : (usage.activeNgos ?? 0),
        );
      }),
      aggregate: vi.fn(() => {
        log.push('sum logos');
        return Promise.resolve({
          _sum: { imageBytes: usage.logoBytes ?? null },
        });
      }),
    },
    animal: {
      count: vi.fn(() => {
        log.push('count animals');
        return Promise.resolve(usage.animals ?? 0);
      }),
    },
    animalImage: {
      aggregate: vi.fn(() => {
        log.push('sum images');
        return Promise.resolve({ _sum: { bytes: usage.imageBytes ?? null } });
      }),
    },
  };
  return { tx, log };
}

function serviceWith(overrides: Partial<typeof DEMO> = {}) {
  return new DemoQuotaService({
    demo: { ...DEMO, ...overrides },
  } as unknown as AppConfigService);
}

/** Status and body message of the thrown HttpException. */
async function failure(promise: Promise<unknown> | (() => unknown)) {
  try {
    await (typeof promise === 'function' ? promise() : promise);
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    const http = error as HttpException;
    const body = http.getResponse();
    return {
      status: http.getStatus(),
      message:
        typeof body === 'string' ? body : (body as { message: string }).message,
    };
  }
  throw new Error('expected an HttpException');
}

describe('DemoQuotaService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('assertCanCreateNgo', () => {
    it('com 29 de 30 ONGs e 1 de 2 cadastros do IP, deixa cadastrar', async () => {
      const { tx } = fakeTx({ activeNgos: 29, signupsFromIp: 1 });

      await expect(
        serviceWith().assertCanCreateNgo(tx as never, 'ip-hash'),
      ).resolves.toBeUndefined();
    });

    it('com 30 de 30 ONGs ativas não seed, responde 409 com a mensagem do DEMO-07', async () => {
      const { tx } = fakeTx({ activeNgos: 30 });

      expect(
        await failure(serviceWith().assertCanCreateNgo(tx as never, 'ip-hash')),
      ).toEqual({
        status: 409,
        message:
          'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.',
      });
    });

    it('conta só as ONGs ativas que não são seed (DEMO-07, DEMO-19)', async () => {
      const { tx } = fakeTx();

      await serviceWith().assertCanCreateNgo(tx as never, 'ip-hash');

      expect(tx.ngo.count).toHaveBeenNthCalledWith(1, {
        where: { isSeed: false, status: 'ACTIVE' },
      });
    });

    it('com 2 cadastros do IP nas últimas 24 h, responde 429 com a mensagem do DEMO-08', async () => {
      const { tx } = fakeTx({ activeNgos: 0, signupsFromIp: 2 });

      expect(
        await failure(serviceWith().assertCanCreateNgo(tx as never, 'ip-hash')),
      ).toEqual({
        status: 429,
        message:
          'Limite de cadastros desta rede por hoje. Tente de novo amanhã.',
      });
    });

    it('conta os cadastros do mesmo IP nas últimas 24 h', async () => {
      const { tx } = fakeTx();

      await serviceWith().assertCanCreateNgo(tx as never, 'hash-do-ip');

      expect(tx.ngo.count).toHaveBeenNthCalledWith(2, {
        where: {
          isSeed: false,
          signupIpHash: 'hash-do-ip',
          createdAt: { gt: new Date('2026-10-19T12:00:00.000Z') },
        },
      });
    });

    it('pega o lock quota:ngos antes de contar', async () => {
      const { tx, log } = fakeTx();

      await serviceWith().assertCanCreateNgo(tx as never, 'ip-hash');

      expect(log).toEqual(['lock quota:ngos', 'count ngos', 'count signups']);
    });
  });

  describe('assertCanAddAnimal', () => {
    it('com 9 de 10 animais, deixa cadastrar', async () => {
      const { tx } = fakeTx({ animals: 9 });

      await expect(
        serviceWith().assertCanAddAnimal(tx as never, 'ngo-1'),
      ).resolves.toBeUndefined();
      expect(tx.animal.count).toHaveBeenCalledWith({
        where: { ngoId: 'ngo-1' },
      });
    });

    it('com 10 de 10 animais, responde 409 com a mensagem do DEMO-09', async () => {
      const { tx } = fakeTx({ animals: 10 });

      expect(
        await failure(serviceWith().assertCanAddAnimal(tx as never, 'ngo-1')),
      ).toEqual({
        status: 409,
        message:
          'Sua ONG atingiu o limite de 10 animais da demo. Exclua um animal para cadastrar outro.',
      });
    });

    it('a mensagem usa o valor de DEMO_MAX_ANIMALS_PER_NGO', async () => {
      const { tx } = fakeTx({ animals: 4 });

      expect(
        await failure(
          serviceWith({ maxAnimalsPerNgo: 4 }).assertCanAddAnimal(
            tx as never,
            'ngo-1',
          ),
        ),
      ).toEqual({
        status: 409,
        message:
          'Sua ONG atingiu o limite de 4 animais da demo. Exclua um animal para cadastrar outro.',
      });
    });

    it('pega o lock quota:animals:{ngoId} antes de contar', async () => {
      const { tx, log } = fakeTx();

      await serviceWith().assertCanAddAnimal(tx as never, 'ngo-42');

      expect(log).toEqual(['lock quota:animals:ngo-42', 'count animals']);
    });
  });

  describe('assertImageCount', () => {
    it('aceita até 3 fotos', () => {
      expect(() => serviceWith().assertImageCount(3)).not.toThrow();
    });

    it('com 4 fotos, responde 409 com a mensagem do DEMO-10', async () => {
      expect(await failure(() => serviceWith().assertImageCount(4))).toEqual({
        status: 409,
        message: 'Este animal já tem o máximo de 3 fotos da demo.',
      });
    });

    it('a mensagem usa o valor de DEMO_MAX_IMAGES_PER_ANIMAL', async () => {
      expect(
        await failure(() =>
          serviceWith({ maxImagesPerAnimal: 2 }).assertImageCount(3),
        ),
      ).toEqual({
        status: 409,
        message: 'Este animal já tem o máximo de 2 fotos da demo.',
      });
    });
  });

  describe('assertUploadSize', () => {
    it('aceita exatamente 5 MB', () => {
      expect(() => serviceWith().assertUploadSize(5 * MB)).not.toThrow();
    });

    it('com 1 byte acima de 5 MB, responde 413 com a mensagem do DEMO-11', async () => {
      expect(
        await failure(() => serviceWith().assertUploadSize(5 * MB + 1)),
      ).toEqual({ status: 413, message: 'O arquivo passa de 5 MB.' });
    });

    it('a mensagem usa o valor de DEMO_MAX_UPLOAD_MB', async () => {
      expect(
        await failure(() =>
          serviceWith({ maxUploadMb: 2 }).assertUploadSize(2 * MB + 1),
        ),
      ).toEqual({ status: 413, message: 'O arquivo passa de 2 MB.' });
    });
  });

  describe('assertStorage', () => {
    it('deixa enviar quando o total fica exatamente no limite', async () => {
      const { tx } = fakeTx({ imageBytes: 400 * MB, logoBytes: 99 * MB });

      await expect(
        serviceWith().assertStorage(tx as never, MB),
      ).resolves.toBeUndefined();
    });

    it('quando o bucket mais o arquivo passa de 500 MB, responde 409 com a mensagem do DEMO-12', async () => {
      const { tx } = fakeTx({ imageBytes: 400 * MB, logoBytes: 99 * MB });

      expect(
        await failure(serviceWith().assertStorage(tx as never, MB + 1)),
      ).toEqual({
        status: 409,
        message:
          'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
      });
    });

    it('soma fotos de animais e imagens de ONG, sem as seeds (DEMO-19)', async () => {
      const { tx } = fakeTx();

      await serviceWith().assertStorage(tx as never, MB);

      expect(tx.animalImage.aggregate).toHaveBeenCalledWith({
        _sum: { bytes: true },
        where: { ngo: { isSeed: false } },
      });
      expect(tx.ngo.aggregate).toHaveBeenCalledWith({
        _sum: { imageBytes: true },
        where: { isSeed: false },
      });
    });

    it('bucket vazio (somas null) conta como zero', async () => {
      const { tx } = fakeTx({ imageBytes: null, logoBytes: null });

      await expect(
        serviceWith({ maxStorageMb: 1 }).assertStorage(tx as never, MB),
      ).resolves.toBeUndefined();
      expect(
        await failure(
          serviceWith({ maxStorageMb: 1 }).assertStorage(tx as never, MB + 1),
        ),
      ).toMatchObject({ status: 409 });
    });

    it('pega o lock quota:storage antes de somar', async () => {
      const { tx, log } = fakeTx();

      await serviceWith().assertStorage(tx as never, MB);

      expect(log[0]).toBe('lock quota:storage');
      expect(log.slice(1).sort()).toEqual(['sum images', 'sum logos']);
    });
  });

  describe('com DEMO_MODE=false (DEMO-20)', () => {
    const off = () => serviceWith({ enabled: false });

    it('as cotas DEMO_* não lançam, mesmo acima de todos os limites', async () => {
      const { tx } = fakeTx({
        activeNgos: 1000,
        signupsFromIp: 1000,
        animals: 1000,
        imageBytes: 10_000 * MB,
        logoBytes: 10_000 * MB,
      });

      await expect(
        off().assertCanCreateNgo(tx as never, 'ip-hash'),
      ).resolves.toBeUndefined();
      await expect(
        off().assertCanAddAnimal(tx as never, 'ngo-1'),
      ).resolves.toBeUndefined();
      expect(() => off().assertImageCount(4)).not.toThrow();
      expect(() => off().assertUploadSize(6 * MB)).not.toThrow();
      await expect(
        off().assertStorage(tx as never, 600 * MB),
      ).resolves.toBeUndefined();
    });

    it('não pega lock nem consulta o banco', async () => {
      const { tx, log } = fakeTx();

      await off().assertCanCreateNgo(tx as never, 'ip-hash');
      await off().assertCanAddAnimal(tx as never, 'ngo-1');
      await off().assertStorage(tx as never, MB);

      expect(log).toEqual([]);
    });
  });
});
