import { createHmac } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

vi.hoisted(() => {
  Object.assign(process.env, { THROTTLE_LIMIT: '1000' });
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { AppConfigService } =
  await import('@/common/config/app-config.service.js');
const { PasswordHasher } = await import('@/common/crypto/password-hasher.js');
const { PrismaService } = await import('@/common/prisma/prisma.service.js');
const { IMailer } = await import('@/modules/mail/adapters/smtp-mailer.js');
const { apiClient } = await import('./helpers/api-client.js');

const PREFIX = 'e2e-auth-';
const PASSWORD = 'senha1234';
const NEW_PASSWORD = 'novaSenha99';
const HEX64 = /^[0-9a-f]{64}$/;

const email = (name: string) => `${PREFIX}${name}@example.com`;

// Each scenario uses its own IP, so no limit leaks into another.
const IPS = {
  flow: '203.0.113.10',
  lockout: '203.0.113.11',
  reset: '203.0.113.12',
  resetLimit: '203.0.113.13',
  change: '203.0.113.14',
  seed: '203.0.113.15',
  unknown: '203.0.113.16',
};

interface SentMail {
  to: string;
  text: string;
}

// Requires the database: docker compose up -d database
describe('Autenticação (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InstanceType<typeof PrismaService>;
  let passwordHash: string;
  const sent: SentMail[] = [];
  const mailer = {
    send: (message: SentMail) => {
      sent.push(message);
      return Promise.resolve();
    },
  };

  /** rate_limit_hits survives between runs: remove only the keys used here. */
  async function removeTestHits() {
    const secret = app.get(AppConfigService).ipHashSecret;
    const hash = (key: string) =>
      createHmac('sha256', secret).update(key).digest('hex');
    const names = [
      'flow',
      'lockout',
      'reset',
      'limite',
      'troca',
      'seed',
      'vencido',
    ];
    const keys = [
      ...Object.values(IPS),
      ...names.map(email),
      'ninguem@example.com',
      ...Object.values(IPS).flatMap((ip) =>
        [...names.map(email), 'ninguem@example.com'].map((e) => `${ip}|${e}`),
      ),
    ];
    await prisma.rateLimitHit.deleteMany({
      where: { keyHash: { in: keys.map(hash) } },
    });
  }

  async function removeTestNgos() {
    await prisma.ngo.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  }

  async function createNgo(name: string, cnpj: string, isSeed = false) {
    return prisma.ngo.create({
      data: {
        cnpj,
        legalName: `ONG ${name}`,
        slug: `${PREFIX}${name}`,
        description: 'Criada pelo e2e de autenticação.',
        email: email(name),
        whatsapp: '5511987654321',
        passwordHash,
        cep: '01310100',
        street: 'Avenida Paulista',
        number: '1000',
        district: 'Bela Vista',
        city: 'São Paulo',
        uf: 'SP',
        lat: -23.5651,
        lng: -46.6519,
        locationConfirmedAt: new Date(),
        timezone: 'America/Sao_Paulo',
        isSeed,
        termsAcceptedAt: new Date(),
        termsVersion: '2026-10-demo',
      },
    });
  }

  const login = (ip: string, body: object) =>
    apiClient(app)
      .post('/api/v1/auth/sessions')
      .set('X-Client-IP', ip)
      .send(body);
  const me = (token: string) =>
    apiClient(app)
      .get('/api/v1/me/ngo')
      .set('Authorization', `Bearer ${token}`);
  const requestReset = (ip: string, address: string) =>
    apiClient(app)
      .post('/api/v1/auth/password-resets')
      .set('X-Client-IP', ip)
      .send({ email: address });
  const resetWith = (token: string, password: string) =>
    apiClient(app)
      .post(`/api/v1/auth/password-resets/${token}`)
      .send({ password });
  const tokenIn = (mail: SentMail) =>
    /\/recuperar-senha\/([A-Za-z0-9_-]+)/.exec(mail.text)![1]!;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IMailer)
      .useValue(mailer)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    passwordHash = await app.get(PasswordHasher).hash(PASSWORD);
    await removeTestNgos();
    await removeTestHits();
  });

  afterAll(async () => {
    await removeTestNgos();
    await removeTestHits();
    await app.close();
  });

  beforeEach(() => {
    sent.length = 0;
  });

  describe('login e logout', () => {
    it('login → token; GET /me/ngo com o token → 200; logout → o mesmo token dá 401 (AUTH-02, AUTH-05, AUTH-07)', async () => {
      const ngo = await createNgo('flow', 'E2EAUTH0000001');

      const res = await login(IPS.flow, {
        email: email('flow'),
        password: PASSWORD,
      }).expect(201);

      const { token } = res.body as { token: string };
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const profile = await me(token).expect(200);
      expect(profile.body.id).toBe(ngo.id);

      await apiClient(app)
        .delete('/api/v1/auth/sessions/current')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await me(token).expect(401);
      await apiClient(app)
        .delete('/api/v1/auth/sessions/current')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('e-mail com outra caixa também entra (citext)', async () => {
      await login(IPS.flow, {
        email: email('flow').toUpperCase(),
        password: PASSWORD,
      }).expect(201);
    });

    it('e-mail inexistente e senha errada → o mesmo 401 "E-mail ou senha incorretos." (AUTH-03)', async () => {
      const unknown = await login(IPS.unknown, {
        email: 'ninguem@example.com',
        password: PASSWORD,
      }).expect(401);
      const wrong = await login(IPS.unknown, {
        email: email('flow'),
        password: 'errada123',
      }).expect(401);

      expect(unknown.body.message).toBe('E-mail ou senha incorretos.');
      expect(wrong.body).toEqual(unknown.body);
    });

    it('sem e-mail → 400', async () => {
      await login(IPS.unknown, { password: PASSWORD }).expect(400);
    });

    it('ONG seed nunca entra, nem com a senha certa (DEMO-19)', async () => {
      await createNgo('seed', 'E2EAUTH0000002', true);

      const res = await login(IPS.seed, {
        email: email('seed'),
        password: PASSWORD,
      }).expect(401);

      expect(res.body.message).toBe('E-mail ou senha incorretos.');
    });

    it('5 falhas → 429 com Retry-After, mesmo com a senha certa; outro IP ainda entra (AUTH-04)', async () => {
      await createNgo('lockout', 'E2EAUTH0000003');
      const body = { email: email('lockout'), password: 'errada123' };
      for (let i = 0; i < 5; i++) {
        await login(IPS.lockout, body).expect(401);
      }

      const blocked = await login(IPS.lockout, {
        ...body,
        password: PASSWORD,
      }).expect(429);

      expect(blocked.body.message).toBe(
        'Muitas tentativas. Tente de novo em 15 minutos.',
      );
      const retryAfter = Number(blocked.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(14 * 60);
      expect(retryAfter).toBeLessThanOrEqual(15 * 60);
      // The blocked attempt was not recorded (5 rows, not 6).
      const secret = app.get(AppConfigService).ipHashSecret;
      const keyHash = createHmac('sha256', secret)
        .update(`${IPS.lockout}|${email('lockout')}`)
        .digest('hex');
      expect(
        await prisma.rateLimitHit.count({
          where: { bucket: 'login-fail', keyHash },
        }),
      ).toBe(5);

      await login(IPS.flow, { ...body, password: PASSWORD }).expect(201);
    });
  });

  describe('recuperação de senha', () => {
    it('fluxo completo: pedido 202 → e-mail com link → senha nova → sessões revogadas → reuso do link 410 (AUTH-08, AUTH-09, AUTH-12, AUTH-13)', async () => {
      const ngo = await createNgo('reset', 'E2EAUTH0000004');
      const old = await login(IPS.reset, {
        email: email('reset'),
        password: PASSWORD,
      }).expect(201);

      const res = await requestReset(IPS.reset, email('reset')).expect(202);

      expect(res.body).toEqual({});
      expect(sent).toHaveLength(1);
      expect(sent[0]?.to).toBe(email('reset'));
      const token = tokenIn(sent[0]!);
      const row = await prisma.passwordReset.findFirstOrThrow({
        where: { ngoId: ngo.id },
      });
      const validFor = row.expiresAt.getTime() - row.createdAt.getTime();
      expect(validFor).toBeGreaterThan(60 * 60_000 - 5_000);
      expect(validFor).toBeLessThanOrEqual(60 * 60_000);

      await resetWith(token, NEW_PASSWORD).expect(204);

      expect(
        (
          await prisma.passwordReset.findUniqueOrThrow({
            where: { id: row.id },
          })
        ).usedAt,
      ).not.toBeNull();
      await me(old.body.token).expect(401);
      expect(await prisma.session.count({ where: { ngoId: ngo.id } })).toBe(0);
      await login(IPS.reset, {
        email: email('reset'),
        password: PASSWORD,
      }).expect(401);
      await login(IPS.reset, {
        email: email('reset'),
        password: NEW_PASSWORD,
      }).expect(201);

      const reused = await resetWith(token, 'outraSenha77').expect(410);
      expect(reused.body.message).toBe('Este link expirou ou já foi usado.');
    });

    it('link vencido → 410', async () => {
      const ngo = await createNgo('vencido', 'E2EAUTH0000005');
      await requestReset(IPS.reset, email('vencido')).expect(202);
      await prisma.passwordReset.updateMany({
        where: { ngoId: ngo.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const res = await resetWith(tokenIn(sent[0]!), NEW_PASSWORD).expect(410);

      expect(res.body.message).toBe('Este link expirou ou já foi usado.');
    });

    it('token inventado → 410; senha nova fora das regras → 400', async () => {
      await resetWith('token-inventado', NEW_PASSWORD).expect(410);
      await resetWith('token-inventado', 'semnumero').expect(400);
    });

    it('e-mail inexistente → 202 sem envio (AUTH-08)', async () => {
      const res = await requestReset(IPS.unknown, 'ninguem@example.com').expect(
        202,
      );

      expect(res.body).toEqual({});
      expect(sent).toHaveLength(0);
    });

    it('4º pedido na hora → 429 "Muitos pedidos. Tente de novo em 1 hora." com Retry-After (AUTH-11)', async () => {
      await createNgo('limite', 'E2EAUTH0000006');
      for (let i = 0; i < 3; i++) {
        await requestReset(IPS.resetLimit, email('limite')).expect(202);
      }

      const res = await requestReset(IPS.resetLimit, email('limite')).expect(
        429,
      );

      expect(res.body.message).toBe('Muitos pedidos. Tente de novo em 1 hora.');
      const retryAfter = Number(res.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(59 * 60);
      expect(retryAfter).toBeLessThanOrEqual(60 * 60);
      expect(sent).toHaveLength(3);
    });
  });

  describe('PUT /api/v1/me/password', () => {
    it('sem sessão → 401 (AUTH-07)', async () => {
      await apiClient(app)
        .put('/api/v1/me/password')
        .send({ currentPassword: PASSWORD, password: NEW_PASSWORD })
        .expect(401);
    });

    it('senha atual errada → 403 "Senha atual incorreta."; certa → 204, revoga as outras sessões e mantém a atual (PROF-05, PROF-06)', async () => {
      await createNgo('troca', 'E2EAUTH0000007');
      const credentials = { email: email('troca'), password: PASSWORD };
      const current = (await login(IPS.change, credentials).expect(201)).body
        .token as string;
      const other = (await login(IPS.change, credentials).expect(201)).body
        .token as string;
      const change = (body: object) =>
        apiClient(app)
          .put('/api/v1/me/password')
          .set('Authorization', `Bearer ${current}`)
          .send(body);

      const wrong = await change({
        currentPassword: 'errada123',
        password: NEW_PASSWORD,
      }).expect(403);
      expect(wrong.body.message).toBe('Senha atual incorreta.');
      await change({ currentPassword: PASSWORD, password: 'curta1' }).expect(
        400,
      );

      await change({
        currentPassword: PASSWORD,
        password: NEW_PASSWORD,
      }).expect(204);

      await me(current).expect(200);
      await me(other).expect(401);
      await login(IPS.change, credentials).expect(401);
      await login(IPS.change, {
        ...credentials,
        password: NEW_PASSWORD,
      }).expect(201);
    });
  });

  it('sessions, password_resets e rate_limit_hits só guardam hashes de 64 caracteres (AUTH-14)', async () => {
    const ngos = await prisma.ngo.findMany({
      where: { slug: { startsWith: PREFIX } },
      select: { id: true },
    });
    const ngoIds = ngos.map((ngo) => ngo.id);
    const sessions = await prisma.session.findMany({
      where: { ngoId: { in: ngoIds } },
    });
    const resets = await prisma.passwordReset.findMany({
      where: { ngoId: { in: ngoIds } },
    });
    const hits = await prisma.rateLimitHit.findMany({ take: 50 });

    expect(sessions.length).toBeGreaterThan(0);
    expect(resets.length).toBeGreaterThan(0);
    for (const { tokenHash } of [...sessions, ...resets]) {
      expect(tokenHash).toMatch(HEX64);
    }
    for (const { keyHash } of hits) {
      expect(keyHash).toMatch(HEX64);
    }
    // The tokens handed out never reach the tables.
    const stored = JSON.stringify([...sessions, ...resets]);
    const { token } = (
      await login(IPS.flow, {
        email: email('flow'),
        password: PASSWORD,
      }).expect(201)
    ).body as { token: string };
    expect(stored).not.toContain(token);
    expect(await prisma.session.count({ where: { tokenHash: token } })).toBe(0);
  });
});
