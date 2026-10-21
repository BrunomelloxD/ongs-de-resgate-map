import { ConflictException, HttpException } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client.js';
import type { INgosRepository } from '../../repositories/ngos.repository.interface.js';
import { makeNgo, NGO_ID, weekHours } from '../../test-fixtures.js';
import { nextSlug, NgosService, type NgoSignupInput } from '../ngos.service.js';

const NOW = new Date('2026-10-20T13:30:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const IP_HASH = 'a'.repeat(64);
const REQUEST_ID = '0f8e7d6c-5b4a-4392-8170-6f5e4d3c2b1a';

function input(overrides: Partial<NgoSignupInput> = {}): NgoSignupInput {
  return {
    signupRequestId: REQUEST_ID,
    cnpj: '11222333000181',
    password: 'senha1234',
    legalName: 'Patas do Bairro',
    description: 'Resgatamos cães e gatos na zona sul de São Paulo.',
    email: 'contato@patas.org',
    whatsapp: '5511987654321',
    cep: '04101300',
    street: 'Rua Vergueiro',
    number: '3000',
    complement: null,
    district: 'Vila Mariana',
    city: 'São Paulo',
    uf: 'SP',
    lat: -23.5869,
    lng: -46.6347,
    locationConfirmedAt: new Date('2026-10-20T13:00:00.000Z'),
    openingHours: weekHours(),
    ...overrides,
  };
}

function uniqueError(index: string) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint', {
    code: 'P2002',
    clientVersion: 'test',
    meta: {
      modelName: 'Ngo',
      driverAdapterError: {
        cause: { kind: 'UniqueConstraintViolation', constraint: { index } },
      },
    },
  });
}

interface Options {
  demoEnabled?: boolean;
  takenSlugs?: string[];
  existing?: ReturnType<typeof makeNgo> | null;
}

function setup(options: Options = {}) {
  const log: string[] = [];
  const tx = {
    $executeRaw: vi.fn((_: TemplateStringsArray, key: string) => {
      log.push(`lock ${key}`);
      return Promise.resolve(1);
    }),
  };
  const ngos = {
    transaction: vi.fn((fn: (client: unknown) => Promise<unknown>) => fn(tx)),
    findBySignupRequestId: vi.fn().mockResolvedValue(options.existing ?? null),
    findSlugsStartingWith: vi.fn(() => {
      log.push('slugs');
      return Promise.resolve(options.takenSlugs ?? []);
    }),
    create: vi.fn(
      (_tx: unknown, data: Record<string, unknown>, _hours: unknown) => {
        log.push('create');
        return Promise.resolve(makeNgo({ ...data, id: NGO_ID }));
      },
    ),
  };
  const sessions = {
    create: vi.fn().mockResolvedValue({ token: 'new-session-token' }),
  };
  const quota = {
    assertCanCreateNgo: vi.fn(() => {
      log.push('quota');
      return Promise.resolve();
    }),
  };
  const hasher = {
    hash: vi.fn((plain: string) => Promise.resolve(`hashed:${plain}`)),
    verify: vi.fn((hashed: string, plain: string) =>
      Promise.resolve(hashed === `hashed:${plain}`),
    ),
  };
  const config = {
    demo: { enabled: options.demoEnabled ?? true, retentionDays: 7 },
  };
  const service = new NgosService(
    ngos as unknown as INgosRepository,
    sessions as never,
    quota as never,
    hasher as never,
    config as never,
    {} as never,
  );
  return { log, tx, ngos, sessions, quota, hasher, service };
}

/** The data passed to the repository's create. */
function created(ngos: ReturnType<typeof setup>['ngos']) {
  return ngos.create.mock.calls[0][1];
}

describe('NgosService.signup', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cria a ONG ACTIVE com os 7 horários, o aceite 2026-10-demo e a sessão (SIGN-28)', async () => {
    const { ngos, sessions, quota, tx, service } = setup();

    const result = await service.signup(input(), IP_HASH);

    expect(quota.assertCanCreateNgo).toHaveBeenCalledWith(tx, IP_HASH);
    expect(created(ngos)).toMatchObject({
      cnpj: '11222333000181',
      legalName: 'Patas do Bairro',
      slug: 'patas-do-bairro',
      status: 'ACTIVE',
      isSeed: false,
      termsAcceptedAt: NOW,
      termsVersion: '2026-10-demo',
      signupRequestId: REQUEST_ID,
      signupIpHash: IP_HASH,
      passwordHash: 'hashed:senha1234',
      timezone: 'America/Sao_Paulo',
    });
    expect(created(ngos)).not.toHaveProperty('password');
    expect(created(ngos)).not.toHaveProperty('openingHours');
    expect(ngos.create.mock.calls[0][2]).toEqual(weekHours());
    expect(sessions.create).toHaveBeenCalledWith(NGO_ID);
    expect(result.token).toBe('new-session-token');
    expect(result.ngo).toMatchObject({ id: NGO_ID, slug: 'patas-do-bairro' });
    expect(result.ngo).not.toHaveProperty('passwordHash');
  });

  it('cota, lock do slug e consulta dos slugs acontecem antes de criar, na mesma transação (DEMO-13)', async () => {
    const { log, service } = setup();

    await service.signup(input(), IP_HASH);

    expect(log).toEqual([
      'quota',
      'lock slug:patas-do-bairro',
      'slugs',
      'create',
    ]);
  });

  it('o fuso vem da UF: AM → America/Manaus (SIGN-30)', async () => {
    const { ngos, service } = setup();

    await service.signup(input({ uf: 'AM' }), IP_HASH);

    expect(created(ngos).timezone).toBe('America/Manaus');
  });

  it('com a demo ligada, expiresAt = criação + DEMO_RETENTION_DAYS (DEMO-04)', async () => {
    const { ngos, service } = setup({ demoEnabled: true });

    await service.signup(input(), IP_HASH);

    expect(created(ngos).createdAt).toEqual(NOW);
    expect(created(ngos).expiresAt).toEqual(
      new Date(NOW.getTime() + 7 * DAY_MS),
    );
  });

  it('com a demo desligada, expiresAt é nulo (DEMO-20)', async () => {
    const { ngos, service } = setup({ demoEnabled: false });

    await service.signup(input(), IP_HASH);

    expect(created(ngos).expiresAt).toBeNull();
  });

  it('slug existente vira -2 (SIGN-29)', async () => {
    const { ngos, service } = setup({ takenSlugs: ['patas-do-bairro'] });

    await service.signup(input(), IP_HASH);

    expect(ngos.findSlugsStartingWith).toHaveBeenCalledWith(
      expect.anything(),
      'patas-do-bairro',
    );
    expect(created(ngos).slug).toBe('patas-do-bairro-2');
  });

  it('com -2 existente vira -3 (SIGN-29)', async () => {
    const { ngos, service } = setup({
      takenSlugs: ['patas-do-bairro', 'patas-do-bairro-2'],
    });

    await service.signup(input(), IP_HASH);

    expect(created(ngos).slug).toBe('patas-do-bairro-3');
  });

  it('cota estourada (DEMO-07/08) → o erro da cota, sem criar nem abrir sessão', async () => {
    const { ngos, quota, sessions, service } = setup();
    const limit = new HttpException(
      'Limite de cadastros desta rede por hoje. Tente de novo amanhã.',
      429,
    );
    quota.assertCanCreateNgo.mockRejectedValue(limit);

    await expect(service.signup(input(), IP_HASH)).rejects.toBe(limit);
    expect(ngos.create).not.toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('P2002 em email → 409 com field "email" (SIGN-31)', async () => {
    const { ngos, sessions, service } = setup();
    ngos.create.mockRejectedValue(uniqueError('ngos_email_key'));

    const error = await service.signup(input(), IP_HASH).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getStatus()).toBe(409);
    expect(error.getResponse()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'Este e-mail já tem cadastro.',
      field: 'email',
    });
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('P2002 em cnpj → 409 com field "cnpj" e a mensagem do SIGN-05 (SIGN-31)', async () => {
    const { ngos, service } = setup();
    ngos.create.mockRejectedValue(uniqueError('ngos_cnpj_key'));

    const error = await service.signup(input(), IP_HASH).catch((e) => e);

    expect(error.getResponse()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message:
        'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.',
      field: 'cnpj',
    });
  });

  it('outro P2002 (slug) e outros erros seguem sem tradução', async () => {
    const { ngos, service } = setup();
    const slugError = uniqueError('ngos_slug_key');
    ngos.create.mockRejectedValueOnce(slugError);
    const other = new Error('db down');
    ngos.create.mockRejectedValueOnce(other);

    await expect(service.signup(input(), IP_HASH)).rejects.toBe(slugError);
    await expect(service.signup(input(), IP_HASH)).rejects.toBe(other);
  });

  it('erro P2002 sem meta não é tratado como campo', async () => {
    const { ngos, service } = setup();
    const bare = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    ngos.create.mockRejectedValue(bare);

    await expect(service.signup(input(), IP_HASH)).rejects.toBe(bare);
  });

  describe('mesmo signupRequestId (SIGN-32)', () => {
    const existing = makeNgo({ passwordHash: 'hashed:senha1234' });

    it('mesma senha → devolve a ONG existente com sessão nova, sem criar outra', async () => {
      const { ngos, sessions, quota, service } = setup({ existing });

      const result = await service.signup(input(), IP_HASH);

      expect(ngos.findBySignupRequestId).toHaveBeenCalledWith(REQUEST_ID);
      expect(ngos.create).not.toHaveBeenCalled();
      expect(quota.assertCanCreateNgo).not.toHaveBeenCalled();
      expect(sessions.create).toHaveBeenCalledWith(existing.id);
      expect(result).toEqual({
        token: 'new-session-token',
        ngo: expect.objectContaining({ id: existing.id, cnpj: existing.cnpj }),
      });
    });

    it('outra senha → 409, sem sessão', async () => {
      const { ngos, sessions, service } = setup({ existing });

      const error = await service
        .signup(input({ password: 'outra1234' }), IP_HASH)
        .catch((e) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe('Este cadastro já foi enviado.');
      expect(ngos.create).not.toHaveBeenCalled();
      expect(sessions.create).not.toHaveBeenCalled();
    });

    it('envio simultâneo: P2002 em signup_request_id devolve a ONG que venceu', async () => {
      const { ngos, sessions, service } = setup();
      ngos.findBySignupRequestId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      ngos.create.mockRejectedValue(uniqueError('ngos_signup_request_id_key'));

      const result = await service.signup(input(), IP_HASH);

      expect(result.ngo.id).toBe(existing.id);
      expect(sessions.create).toHaveBeenCalledTimes(1);
      expect(sessions.create).toHaveBeenCalledWith(existing.id);
    });

    it('envio simultâneo: P2002 no índice do CNPJ, mas a ONG é do mesmo envio → devolve a vencedora', async () => {
      const { ngos, service } = setup();
      ngos.findBySignupRequestId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      ngos.create.mockRejectedValue(uniqueError('ngos_cnpj_key'));

      const result = await service.signup(input(), IP_HASH);

      expect(result.ngo.id).toBe(existing.id);
      expect(ngos.findBySignupRequestId).toHaveBeenLastCalledWith(REQUEST_ID);
    });

    it('P2002 em signup_request_id sem a ONG vencedora → o erro original', async () => {
      const { ngos, service } = setup();
      const race = uniqueError('ngos_signup_request_id_key');
      ngos.create.mockRejectedValue(race);

      await expect(service.signup(input(), IP_HASH)).rejects.toBe(race);
    });
  });
});

describe('nextSlug (SIGN-29)', () => {
  it.each([
    [[], 'patas'],
    [['patas-do-bairro'], 'patas'],
    [['patas'], 'patas-2'],
    [['patas', 'patas-2'], 'patas-3'],
    [['patas', 'patas-3'], 'patas-2'],
  ])('ocupados %j → %s', (taken, expected) => {
    expect(nextSlug('patas', taken)).toBe(expected);
  });
});
