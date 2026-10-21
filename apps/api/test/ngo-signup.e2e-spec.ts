import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

// Set before AppModule validates the env. The per-test quotas come from TestConfig.
vi.hoisted(() => {
  Object.assign(process.env, {
    THROTTLE_LIMIT: '1000',
    DEMO_MODE: 'true',
    DEMO_RETENTION_DAYS: '3',
    DEMO_SIGNUPS_PER_IP_PER_DAY: '1000',
  });
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { AppConfigService } =
  await import('@/common/config/app-config.service.js');
const { hashIp } = await import('@/common/crypto/ip-hash.js');
const { PrismaService } = await import('@/common/prisma/prisma.service.js');
const { apiClient } = await import('./helpers/api-client.js');

type Demo = InstanceType<typeof AppConfigService>['demo'];

/** DEMO_MAX_NGOS counts every non-seed NGO in the database, so each test sets it. */
class TestConfig extends AppConfigService {
  static overrides: Partial<Demo> = {};

  override get demo(): Demo {
    return { ...super.demo, ...TestConfig.overrides };
  }
}

const DOMAIN = '@e2e-signup.test';
const DAY_MS = 24 * 60 * 60 * 1000;
const CNPJ_MESSAGE =
  'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.';

/** Check digits by the SIGN-04 rule, to build valid test CNPJs. */
function withCheckDigits(base: string): string {
  const digit = (value: string) => {
    let sum = 0;
    for (let i = 0; i < value.length; i++) {
      sum += (value.charCodeAt(i) - 48) * (((value.length - 1 - i) % 8) + 2);
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(base);
  return `${base}${first}${digit(`${base}${first}`)}`;
}

let counter = 0;
function newCnpj(): string {
  counter += 1;
  return withCheckDigits(`E2ES${String(counter).padStart(8, '0')}`);
}

const HOURS = Array.from({ length: 7 }, (_, dayOfWeek) =>
  dayOfWeek === 0
    ? { dayOfWeek, closed: true }
    : { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '18:00' },
);

function signupBody(overrides: Record<string, unknown> = {}) {
  const id = randomUUID();
  return {
    signupRequestId: id,
    cnpj: newCnpj(),
    password: 'senha1234',
    termsAccepted: true,
    legalName: `E2E Cadastro ${id.slice(0, 8)}`,
    description: 'ONG criada pelo e2e do cadastro, com mais de 30 letras.',
    email: `${id}${DOMAIN}`,
    whatsapp: '5511987654321',
    cep: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    district: 'Bela Vista',
    city: 'Manaus',
    uf: 'AM',
    lat: -3.119,
    lng: -60.0217,
    locationConfirmedAt: new Date().toISOString(),
    openingHours: HOURS,
    ...overrides,
  };
}

let ipCounter = 0;
function newIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

// Requires the database: docker compose up -d database
describe('Cadastro da ONG (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InstanceType<typeof PrismaService>;

  async function removeTestNgos() {
    await prisma.ngo.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppConfigService)
      .useClass(TestConfig)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await removeTestNgos();
  });

  afterEach(() => {
    TestConfig.overrides = {};
  });

  afterAll(async () => {
    await removeTestNgos();
    await app.close();
  });

  const signup = (body: Record<string, unknown>, ip = newIp()) =>
    apiClient(app).post('/api/v1/ngos').set('X-Client-IP', ip).send(body);

  describe('POST /api/v1/ngos', () => {
    it('cadastro válido → 201 com token, ONG ACTIVE, 7 horários, aceite e sessão (SIGN-28)', async () => {
      const body = signupBody({ cnpj: withCheckDigits('12ABC34501DE') });
      const ip = newIp();

      const res = await signup(body, ip).expect(201);

      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.ngo).toMatchObject({
        cnpj: body.cnpj,
        legalName: body.legalName,
        email: body.email,
        timezone: 'America/Manaus',
      });
      expect(res.body.ngo.weekHours).toHaveLength(7);
      expect(res.body.ngo).not.toHaveProperty('passwordHash');

      const ngo = await prisma.ngo.findUniqueOrThrow({
        where: { id: res.body.ngo.id },
        include: { openingHours: true, sessions: true },
      });
      expect(ngo.status).toBe('ACTIVE');
      expect(ngo.isSeed).toBe(false);
      expect(ngo.openingHours).toHaveLength(7);
      expect(ngo.termsVersion).toBe('2026-10-demo');
      expect(ngo.termsAcceptedAt).toEqual(ngo.createdAt);
      expect(ngo.passwordHash).not.toContain('senha1234');
      expect(ngo.signupIpHash).toBe(
        hashIp(ip, app.get(AppConfigService).ipHashSecret),
      );
      expect(ngo.sessions).toHaveLength(1);
      // DEMO-04: expires_at = created_at + DEMO_RETENTION_DAYS (3).
      expect(ngo.expiresAt!.getTime() - ngo.createdAt.getTime()).toBe(
        3 * DAY_MS,
      );
    });

    it('o slug vem da razão social, com -2 quando já existe (SIGN-29)', async () => {
      const name = `E2E Cadastro Ação ${randomUUID().slice(0, 6)}`;
      const base = `e2e-cadastro-acao-${name.slice(-6).toLowerCase()}`;

      const first = await signup(signupBody({ legalName: name })).expect(201);
      const second = await signup(signupBody({ legalName: name })).expect(201);

      expect(first.body.ngo.slug).toBe(base);
      expect(second.body.ngo.slug).toBe(`${base}-2`);
    });

    it('CNPJ com DV errado → 400 com a mensagem do SIGN-04', async () => {
      const res = await signup(signupBody({ cnpj: '11222333000182' })).expect(
        400,
      );

      expect(res.body.message).toContain(CNPJ_MESSAGE);
    });

    it('CNPJ com máscara → 400: a api só aceita a forma normalizada', async () => {
      await signup(signupBody({ cnpj: '11.222.333/0001-81' })).expect(400);
    });

    it('CNPJ duplicado → 409 com field "cnpj" e a mensagem do SIGN-05 (SIGN-31)', async () => {
      const first = signupBody();
      await signup(first).expect(201);

      const res = await signup(signupBody({ cnpj: first.cnpj })).expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message:
          'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.',
        field: 'cnpj',
      });
    });

    it('e-mail duplicado, mesmo com outra caixa → 409 com field "email" (SIGN-31)', async () => {
      const first = signupBody();
      await signup(first).expect(201);

      const res = await signup(
        signupBody({ email: (first.email as string).toUpperCase() }),
      ).expect(409);

      expect(res.body.field).toBe('email');
    });

    it.each([
      [
        'fechamento antes da abertura',
        {
          openingHours: HOURS.map((day) =>
            day.dayOfWeek === 1 ? { ...day, closesAt: '08:00' } : day,
          ),
        },
        'O horário de fechamento deve ser depois da abertura.',
      ],
      [
        'fechamento igual à abertura',
        {
          openingHours: HOURS.map((day) =>
            day.dayOfWeek === 1 ? { ...day, closesAt: '09:00' } : day,
          ),
        },
        'O horário de fechamento deve ser depois da abertura.',
      ],
    ])('%s → 400 (SIGN-25)', async (_case, overrides, message) => {
      const res = await signup(signupBody(overrides)).expect(400);

      expect(JSON.stringify(res.body.message)).toContain(message);
    });

    it.each([
      ['sem aceite dos termos', { termsAccepted: false }],
      ['6 dias de horário', { openingHours: HOURS.slice(1) }],
      ['dia repetido', { openingHours: [...HOURS.slice(1), { ...HOURS[1] }] }],
      [
        'dia aberto sem abertura',
        {
          openingHours: HOURS.map((day) =>
            day.dayOfWeek === 2 ? { dayOfWeek: 2, closed: false } : day,
          ),
        },
      ],
      ['razão social com 151 caracteres', { legalName: 'a'.repeat(151) }],
      ['descrição com 29 caracteres', { description: 'a'.repeat(29) }],
      ['WhatsApp com DDD inexistente', { whatsapp: '5520987654321' }],
      ['senha sem número', { password: 'somenteletras' }],
      ['UF inexistente', { uf: 'XX' }],
      ['sem confirmação do pino', { locationConfirmedAt: undefined }],
      ['campo desconhecido', { status: 'SUSPENDED' }],
    ])('%s → 400', async (_case, overrides) => {
      await signup(signupBody(overrides)).expect(400);
    });

    it('o mesmo envio duas vezes → uma ONG só, com duas sessões (SIGN-32)', async () => {
      const body = signupBody();

      const first = await signup(body).expect(201);
      const second = await signup(body).expect(201);

      expect(second.body.ngo.id).toBe(first.body.ngo.id);
      expect(second.body.token).not.toBe(first.body.token);
      expect(
        await prisma.ngo.count({ where: { cnpj: body.cnpj as string } }),
      ).toBe(1);
      expect(
        await prisma.session.count({ where: { ngoId: first.body.ngo.id } }),
      ).toBe(2);
    });

    it('o mesmo envio duas vezes ao mesmo tempo → uma ONG só (SIGN-32)', async () => {
      const body = signupBody();

      const results = await Promise.all([signup(body), signup(body)]);

      expect(results.map((res) => res.status)).toEqual([201, 201]);
      expect(results[0].body.ngo.id).toBe(results[1].body.ngo.id);
      expect(
        await prisma.ngo.count({ where: { cnpj: body.cnpj as string } }),
      ).toBe(1);
    });

    it('mesmo signupRequestId com outra senha → 409 e nenhuma ONG nova', async () => {
      const body = signupBody();
      await signup(body).expect(201);

      await signup({ ...body, password: 'outra1234' }).expect(409);

      expect(
        await prisma.ngo.count({ where: { cnpj: body.cnpj as string } }),
      ).toBe(1);
    });

    it('com DEMO_MAX_NGOS=3, 10 cadastros em paralelo criam exatamente 3 ONGs (DEMO-07, DEMO-13)', async () => {
      await removeTestNgos();
      const existing = await prisma.ngo.count({
        where: { isSeed: false, status: 'ACTIVE' },
      });
      // Three free slots, whatever else is in the database.
      TestConfig.overrides = { maxNgos: existing + 3 };

      const results = await Promise.all(
        Array.from({ length: 10 }, () => signup(signupBody())),
      );

      const statuses = results.map((res) => res.status).sort((a, b) => a - b);
      expect(statuses).toEqual([
        201, 201, 201, 409, 409, 409, 409, 409, 409, 409,
      ]);
      expect(
        await prisma.ngo.count({ where: { email: { endsWith: DOMAIN } } }),
      ).toBe(3);
      const refused = results.find((res) => res.status === 409)!;
      expect(refused.body.message).toBe(
        'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.',
      );
    });

    it('o mesmo IP além de DEMO_SIGNUPS_PER_IP_PER_DAY → 429 (DEMO-08)', async () => {
      TestConfig.overrides = { signupsPerIpPerDay: 1 };
      const ip = newIp();

      await signup(signupBody(), ip).expect(201);
      const res = await signup(signupBody(), ip).expect(429);

      expect(res.body.message).toBe(
        'Limite de cadastros desta rede por hoje. Tente de novo amanhã.',
      );
      await signup(signupBody(), newIp()).expect(201);
    });
  });

  describe('POST /api/v1/ngos/validations/*', () => {
    const check = (kind: 'cnpj' | 'email', body: object, ip = newIp()) =>
      apiClient(app)
        .post(`/api/v1/ngos/validations/${kind}`)
        .set('X-Client-IP', ip)
        .send(body);

    let taken: Record<string, unknown>;

    beforeAll(async () => {
      taken = signupBody();
      await signup(taken).expect(201);
    });

    it('CNPJ já cadastrado → { available: false }; livre → true (SIGN-05)', async () => {
      const used = await check('cnpj', { cnpj: taken.cnpj }).expect(200);
      const free = await check('cnpj', { cnpj: newCnpj() }).expect(200);

      expect(used.body).toEqual({ available: false });
      expect(free.body).toEqual({ available: true });
    });

    it('CNPJ inválido → 400 com a mensagem do SIGN-04', async () => {
      const res = await check('cnpj', { cnpj: '11222333000182' }).expect(400);

      expect(res.body.message).toContain(CNPJ_MESSAGE);
    });

    it('e-mail já cadastrado (outra caixa) → false; livre → true (SIGN-12)', async () => {
      const used = await check('email', {
        email: (taken.email as string).toUpperCase(),
      }).expect(200);
      const free = await check('email', {
        email: `livre-${randomUUID()}${DOMAIN}`,
      }).expect(200);

      expect(used.body).toEqual({ available: false });
      expect(free.body).toEqual({ available: true });
    });

    it('e-mail inválido → 400', async () => {
      await check('email', { email: 'sem-arroba' }).expect(400);
    });

    it.each(['cnpj', 'email'] as const)(
      '%s: a 21ª validação do mesmo IP no minuto → 429',
      async (kind) => {
        const ip = newIp();
        const body =
          kind === 'cnpj' ? { cnpj: newCnpj() } : { email: `x${DOMAIN}` };

        for (let i = 0; i < 20; i++) {
          await check(kind, body, ip).expect(200);
        }
        await check(kind, body, ip).expect(429);
        await check(kind, body, newIp()).expect(200);
      },
    );
  });
});
