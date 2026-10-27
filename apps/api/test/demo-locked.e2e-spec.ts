import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

const ACCOUNT_EMAIL = 'e2e-demo-conta@example.com';
const PASSWORD = 'Demo1234';

// Own file: the env is validated once, when AppModule is imported.
vi.hoisted(() => {
  Object.assign(process.env, {
    THROTTLE_LIMIT: '1000',
    DEMO_MODE: 'true',
    DEMO_LOCKED: 'true',
    DEMO_ACCOUNT_EMAIL: 'e2e-demo-conta@example.com',
    DEMO_ACCOUNT_PASSWORD: 'Demo1234',
  });
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { PasswordHasher } = await import('@/common/crypto/password-hasher.js');
const { PrismaService } = await import('@/common/prisma/prisma.service.js');
const { InMemoryObjectStorage, IObjectStorage } =
  await import('@/modules/media/adapters/object-storage.js');
const { IMailer } = await import('@/modules/mail/adapters/smtp-mailer.js');
const { CleanupService } =
  await import('@/modules/demo/services/cleanup.service.js');
const { SessionsService } =
  await import('@/modules/sessions/services/sessions.service.js');
const { apiClient } = await import('./helpers/api-client.js');

const FIXTURES = join(import.meta.dirname, 'fixtures');
const PREFIX = 'e2e-demo-';
const LOCKED = { message: 'Indisponível na demo.' };

const ANIMAL = {
  name: 'Caramelo',
  species: 'DOG',
  sex: 'MALE',
  size: 'MEDIUM',
  ageValue: 3,
  ageUnit: 'YEARS',
};

const HOURS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  closed: dayOfWeek === 0,
  opensAt: dayOfWeek === 0 ? null : '09:00',
  closesAt: dayOfWeek === 0 ? null : '18:00',
}));

// Requires the database: docker compose up -d database
describe('Demo fechada, DEMO_LOCKED=true (e2e, AD-008)', () => {
  let app: INestApplication<App>;
  let prisma: InstanceType<typeof PrismaService>;
  const storage = new InMemoryObjectStorage();
  const mailer = { send: vi.fn() };
  let png: Buffer;
  let ngoId: string;
  let token: string;

  async function removeTestNgos() {
    await prisma.ngo.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  }

  /** The shared account, as the seed creates it: never expires. */
  async function createDemoAccount() {
    const ngo = await prisma.ngo.create({
      data: {
        cnpj: '11222333000181',
        legalName: 'ONG Demonstração',
        slug: `${PREFIX}conta`,
        description: 'Conta compartilhada da demo.',
        email: ACCOUNT_EMAIL,
        whatsapp: '5511987654321',
        passwordHash: await app.get(PasswordHasher).hash(PASSWORD),
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
        expiresAt: null,
        termsAcceptedAt: new Date(),
        termsVersion: '2026-10-demo',
        openingHours: { create: HOURS },
      },
    });
    return ngo.id;
  }

  const auth = (value = token) => ({ Authorization: `Bearer ${value}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IObjectStorage)
      .useValue(storage)
      .overrideProvider(IMailer)
      .useValue(mailer)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    png = await readFile(join(FIXTURES, 'photo.png'));
    await removeTestNgos();
    ngoId = await createDemoAccount();
  });

  beforeEach(async () => {
    ({ token } = await app.get(SessionsService).create(ngoId));
  });

  afterAll(async () => {
    await removeTestNgos();
    await app.close();
  });

  describe('rotas bloqueadas: 403 "Indisponível na demo." sem mudar nada', () => {
    it('POST /ngos não cria ONG (DEP-10)', async () => {
      const before = await prisma.ngo.count();

      const res = await apiClient(app)
        .post('/api/v1/ngos')
        .send({ legalName: 'Nova ONG' })
        .expect(403);

      expect(res.body).toMatchObject(LOCKED);
      expect(await prisma.ngo.count()).toBe(before);
    });

    it('POST /auth/password-resets não cria link nem envia e-mail (DEP-11)', async () => {
      const res = await apiClient(app)
        .post('/api/v1/auth/password-resets')
        .send({ email: ACCOUNT_EMAIL })
        .expect(403);

      expect(res.body).toMatchObject(LOCKED);
      expect(await prisma.passwordReset.count({ where: { ngoId } })).toBe(0);
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('POST /auth/password-resets/:token não troca a senha (DEP-11)', async () => {
      const { passwordHash } = await prisma.ngo.findUniqueOrThrow({
        where: { id: ngoId },
      });

      const res = await apiClient(app)
        .post('/api/v1/auth/password-resets/qualquer-token')
        .send({ password: 'NovaSenha123' })
        .expect(403);

      expect(res.body).toMatchObject(LOCKED);
      const after = await prisma.ngo.findUniqueOrThrow({
        where: { id: ngoId },
      });
      expect(after.passwordHash).toBe(passwordHash);
    });

    it('PUT /me/password não troca a senha nem revoga sessões (DEP-12)', async () => {
      const { passwordHash } = await prisma.ngo.findUniqueOrThrow({
        where: { id: ngoId },
      });
      const other = await app.get(SessionsService).create(ngoId);

      const res = await apiClient(app)
        .put('/api/v1/me/password')
        .set(auth())
        .send({ currentPassword: PASSWORD, password: 'NovaSenha123' })
        .expect(403);

      expect(res.body).toMatchObject(LOCKED);
      const after = await prisma.ngo.findUniqueOrThrow({
        where: { id: ngoId },
      });
      expect(after.passwordHash).toBe(passwordHash);
      await apiClient(app)
        .get('/api/v1/me/ngo')
        .set(auth(other.token))
        .expect(200);
    });

    it('PATCH /me/ngo não altera o perfil (DEP-12)', async () => {
      const res = await apiClient(app)
        .patch('/api/v1/me/ngo')
        .set(auth())
        .send({ legalName: 'Outro nome' })
        .expect(403);

      expect(res.body).toMatchObject(LOCKED);
      const ngo = await prisma.ngo.findUniqueOrThrow({ where: { id: ngoId } });
      expect(ngo.legalName).toBe('ONG Demonstração');
    });

    it('PUT /me/ngo/image não troca a imagem (DEP-12)', async () => {
      const res = await apiClient(app)
        .put('/api/v1/me/ngo/image')
        .set(auth())
        .attach('file', png, 'logo.png')
        .expect(403);

      expect(res.body).toMatchObject(LOCKED);
      const ngo = await prisma.ngo.findUniqueOrThrow({ where: { id: ngoId } });
      expect(ngo.imageKey).toBeNull();
    });

    it('DELETE /me/ngo não exclui a conta (DEP-12)', async () => {
      const res = await apiClient(app)
        .delete('/api/v1/me/ngo')
        .set(auth())
        .send({ password: PASSWORD })
        .expect(403);

      expect(res.body).toMatchObject(LOCKED);
      expect(await prisma.ngo.count({ where: { id: ngoId } })).toBe(1);
    });
  });

  describe('GET /demo (DEP-18, DEP-22)', () => {
    it('devolve locked, as credenciais e o início do mapa na conta demo', async () => {
      const res = await apiClient(app).get('/api/v1/demo').expect(200);

      expect(res.body).toMatchObject({
        locked: true,
        account: { email: ACCOUNT_EMAIL, password: PASSWORD },
        mapStart: { lat: -23.5651, lng: -46.6519 },
      });
      expect([5, 10, 25]).toContain(res.body.mapStart.radiusKm);
    });
  });

  describe('rotas liberadas (DEP-13)', () => {
    afterEach(async () => {
      await prisma.animal.deleteMany({ where: { ngoId } });
    });

    it('login com as credenciais da conta demo → 201 com token', async () => {
      const res = await apiClient(app)
        .post('/api/v1/auth/sessions')
        .send({ email: ACCOUNT_EMAIL, password: PASSWORD })
        .expect(201);

      expect(typeof res.body.token).toBe('string');
    });

    it('cadastra, edita, troca a disponibilidade e exclui um animal', async () => {
      const upload = await apiClient(app)
        .post('/api/v1/me/images')
        .set(auth())
        .attach('file', png, 'foto.png')
        .expect(201);

      const created = await apiClient(app)
        .post('/api/v1/me/animals')
        .set(auth())
        .send({ ...ANIMAL, imageIds: [upload.body.id] })
        .expect(201);
      const id = created.body.id as string;

      await apiClient(app)
        .patch(`/api/v1/me/animals/${id}`)
        .set(auth())
        .send({ name: 'Paçoca' })
        .expect(200);
      await apiClient(app)
        .patch(`/api/v1/me/animals/${id}/availability`)
        .set(auth())
        .send({ available: false })
        .expect(200);
      expect(
        await prisma.animal.findUniqueOrThrow({ where: { id } }),
      ).toMatchObject({ name: 'Paçoca', available: false });

      await apiClient(app)
        .delete(`/api/v1/me/animals/${id}`)
        .set(auth())
        .expect(204);
      expect(await prisma.animal.count({ where: { id } })).toBe(0);
    });

    it('logout revoga só a sessão de quem saiu (DEP-58)', async () => {
      const other = await app.get(SessionsService).create(ngoId);

      await apiClient(app)
        .delete('/api/v1/auth/sessions/current')
        .set(auth())
        .expect(204);

      await apiClient(app).get('/api/v1/me/ngo').set(auth()).expect(401);
      await apiClient(app)
        .get('/api/v1/me/ngo')
        .set(auth(other.token))
        .expect(200);
    });
  });

  describe('limpeza diária da conta demo (DEP-28 a DEP-30)', () => {
    it('apaga os animais e as fotos da conta demo; o logo e as outras ONGs ficam', async () => {
      const animal = await prisma.animal.create({
        data: { ngoId, ...ANIMAL, species: 'DOG', sex: 'MALE' } as never,
      });
      const keyPrefix = `ngos/${ngoId}/images/${animal.id}`;
      await prisma.animalImage.create({
        data: {
          ngoId,
          animalId: animal.id,
          position: 0,
          keyPrefix,
          bytes: 2,
          width: 1200,
          height: 900,
        },
      });
      await storage.put(
        `${keyPrefix}-160.webp`,
        Buffer.from('a'),
        'image/webp',
      );
      await storage.put(
        `${keyPrefix}-1200.webp`,
        Buffer.from('b'),
        'image/webp',
      );
      const logo = `ngos/${ngoId}/logo/logo-600.webp`;
      await storage.put(logo, Buffer.from('c'), 'image/webp');

      const other = await prisma.ngo.create({
        data: {
          cnpj: '11444777000161',
          legalName: 'ONG de Exemplo',
          slug: `${PREFIX}exemplo`,
          description: 'Outra ONG.',
          email: 'e2e-demo-exemplo@example.com',
          whatsapp: '5511987654322',
          passwordHash: 'x',
          cep: '01310100',
          street: 'Avenida Paulista',
          number: '2000',
          district: 'Bela Vista',
          city: 'São Paulo',
          uf: 'SP',
          lat: -23.5611,
          lng: -46.6559,
          locationConfirmedAt: new Date(),
          timezone: 'America/Sao_Paulo',
          termsAcceptedAt: new Date(),
          termsVersion: '2026-10-demo',
          isSeed: true,
          animals: { create: { ...ANIMAL } as never },
        },
      });

      const report = await app.get(CleanupService).run();

      expect(await prisma.animal.count({ where: { ngoId } })).toBe(0);
      expect(await prisma.animalImage.count({ where: { ngoId } })).toBe(0);
      expect(
        storage.keys().filter((k) => k.startsWith(`ngos/${ngoId}/`)),
      ).toEqual([logo]);
      expect(await prisma.ngo.count({ where: { id: ngoId } })).toBe(1);
      expect(await prisma.animal.count({ where: { ngoId: other.id } })).toBe(1);
      expect(report.animals).toBeGreaterThanOrEqual(1);
      expect(report.objects).toBeGreaterThanOrEqual(2);
    });
  });
});
