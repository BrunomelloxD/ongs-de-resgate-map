import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

// A 1 MB limit keeps the oversized upload small. Set before AppModule validates the env.
vi.hoisted(() => {
  Object.assign(process.env, {
    THROTTLE_LIMIT: '1000',
    DEMO_MODE: 'true',
    DEMO_MAX_UPLOAD_MB: '1',
  });
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { PasswordHasher } = await import('@/common/crypto/password-hasher.js');
const { PrismaService } = await import('@/common/prisma/prisma.service.js');
const { InMemoryObjectStorage, IObjectStorage } =
  await import('@/modules/media/adapters/object-storage.js');
const { SessionsService } =
  await import('@/modules/sessions/services/sessions.service.js');
const { apiClient } = await import('./helpers/api-client.js');

const MB = 1024 * 1024;
const FIXTURES = join(import.meta.dirname, 'fixtures');
const PREFIX = 'e2e-me-';
const PASSWORD = 'senha1234';
const EXPIRES_AT = new Date('2026-12-01T12:00:00.000Z');
const CONFIRMED_AT = new Date('2026-10-20T12:00:00.000Z');

const HOURS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  closed: dayOfWeek === 0,
  opensAt: dayOfWeek === 0 ? null : '09:00',
  closesAt: dayOfWeek === 0 ? null : '18:00',
}));

// Requires the database: docker compose up -d database
describe('Perfil da ONG /me/ngo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InstanceType<typeof PrismaService>;
  const storage = new InMemoryObjectStorage();
  let passwordHash: string;

  async function removeTestNgos() {
    await prisma.ngo.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  }

  /** A fresh NGO with an animal, a photo in the bucket and a session. */
  async function createNgo(name: string, cnpj: string) {
    const ngo = await prisma.ngo.create({
      data: {
        cnpj,
        legalName: `ONG ${name}`,
        slug: `${PREFIX}${name}`,
        description: 'Criada pelo e2e do perfil da ONG.',
        email: `${PREFIX}${name}@example.com`,
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
        locationConfirmedAt: CONFIRMED_AT,
        timezone: 'America/Sao_Paulo',
        expiresAt: EXPIRES_AT,
        termsAcceptedAt: new Date(),
        termsVersion: '2026-10-demo',
        openingHours: { create: HOURS },
      },
    });
    const animal = await prisma.animal.create({
      data: {
        ngoId: ngo.id,
        name: 'Rex',
        species: 'DOG',
        sex: 'MALE',
        size: 'MEDIUM',
        ageValue: 2,
        ageUnit: 'YEARS',
      },
    });
    const keyPrefix = `ngos/${ngo.id}/images/${animal.id}`;
    await prisma.animalImage.create({
      data: {
        ngoId: ngo.id,
        animalId: animal.id,
        position: 0,
        keyPrefix,
        bytes: 10,
        width: 1200,
        height: 900,
      },
    });
    await storage.put(`${keyPrefix}-160.webp`, Buffer.from('a'), 'image/webp');
    await storage.put(`${keyPrefix}-1200.webp`, Buffer.from('b'), 'image/webp');
    const { token } = await app.get(SessionsService).create(ngo.id);
    return { ngo, token };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IObjectStorage)
      .useValue(storage)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    passwordHash = await app.get(PasswordHasher).hash(PASSWORD);
    await removeTestNgos();
  });

  afterAll(async () => {
    await removeTestNgos();
    await app.close();
  });

  const as = (token: string) => ({
    get: () =>
      apiClient(app)
        .get('/api/v1/me/ngo')
        .set('Authorization', `Bearer ${token}`),
    patch: (body: object) =>
      apiClient(app)
        .patch('/api/v1/me/ngo')
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    image: (file: Buffer, name: string) =>
      apiClient(app)
        .put('/api/v1/me/ngo/image')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', file, name),
    delete: (body: object) =>
      apiClient(app)
        .delete('/api/v1/me/ngo')
        .set('Authorization', `Bearer ${token}`)
        .send(body),
  });

  describe('sem sessão', () => {
    it.each([
      ['GET', () => apiClient(app).get('/api/v1/me/ngo')],
      ['PATCH', () => apiClient(app).patch('/api/v1/me/ngo').send({})],
      ['DELETE', () => apiClient(app).delete('/api/v1/me/ngo').send({})],
      ['PUT image', () => apiClient(app).put('/api/v1/me/ngo/image')],
    ])('%s → 401 (AUTH-07)', async (_method, call) => {
      await call().expect(401);
    });
  });

  describe('GET e PATCH', () => {
    let ngo: { id: string };
    let token: string;

    beforeAll(async () => {
      ({ ngo, token } = await createNgo('perfil', 'E2EME000000001'));
      await createNgo('outra', 'E2EME000000002');
    });

    it('GET devolve os dados da própria ONG, com o CNPJ (PROF-01)', async () => {
      const res = await as(token).get().expect(200);

      expect(res.body).toMatchObject({
        id: ngo.id,
        cnpj: 'E2EME000000001',
        legalName: 'ONG perfil',
        email: `${PREFIX}perfil@example.com`,
        expiresAt: EXPIRES_AT.toISOString(),
      });
      expect(res.body.weekHours).toHaveLength(7);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('PATCH com cnpj → 400 e nada muda (PROF-02)', async () => {
      const before = await prisma.ngo.findUniqueOrThrow({
        where: { id: ngo.id },
      });

      await as(token)
        .patch({ cnpj: '11222333000181', description: 'x'.repeat(40) })
        .expect(400);

      const after = await prisma.ngo.findUniqueOrThrow({
        where: { id: ngo.id },
      });
      expect(after).toEqual(before);
    });

    it('PATCH válido grava e mantém expiresAt (PROF-04, DEMO-05)', async () => {
      const description =
        'Descrição nova do perfil, com mais de trinta letras.';

      const res = await as(token).patch({ description }).expect(200);

      expect(res.body.description).toBe(description);
      const row = await prisma.ngo.findUniqueOrThrow({ where: { id: ngo.id } });
      expect(row.description).toBe(description);
      expect(row.expiresAt).toEqual(EXPIRES_AT);
    });

    it('PATCH troca os 7 horários', async () => {
      const hours = HOURS.map((day) =>
        day.dayOfWeek === 6 ? { ...day, closesAt: '12:00' } : day,
      );

      const res = await as(token).patch({ openingHours: hours }).expect(200);

      expect(res.body.weekHours[6].closesAt).toBe('12:00');
      expect(
        await prisma.openingHours.count({ where: { ngoId: ngo.id } }),
      ).toBe(7);
    });

    it('PATCH com endereço novo sem reconfirmar o pino → 400 (PROF-03)', async () => {
      const res = await as(token)
        .patch({ street: 'Rua Augusta', number: '500' })
        .expect(400);

      expect(res.body.message).toBe(
        'Confirme a localização no mapa antes de salvar.',
      );
      const row = await prisma.ngo.findUniqueOrThrow({ where: { id: ngo.id } });
      expect(row.street).toBe('Avenida Paulista');
    });

    it('PATCH da UF com o pino reconfirmado troca o fuso (borda: fuso)', async () => {
      const res = await as(token)
        .patch({
          uf: 'AM',
          city: 'Manaus',
          lat: -3.119,
          lng: -60.0217,
          locationConfirmedAt: new Date().toISOString(),
        })
        .expect(200);

      expect(res.body.timezone).toBe('America/Manaus');
      const row = await prisma.ngo.findUniqueOrThrow({ where: { id: ngo.id } });
      expect(row.timezone).toBe('America/Manaus');
      expect(row.expiresAt).toEqual(EXPIRES_AT);
    });

    it('PATCH com o e-mail de outra ONG → 409 com field "email"', async () => {
      const res = await as(token)
        .patch({ email: `${PREFIX}outra@example.com` })
        .expect(409);

      expect(res.body.field).toBe('email');
    });

    it('PATCH com id de outra ONG no corpo → 400: a ONG vem só do token (SEC-05)', async () => {
      await as(token)
        .patch({ id: '00000000-0000-4000-8000-000000000000' })
        .expect(400);
    });
  });

  describe('PUT /api/v1/me/ngo/image', () => {
    let ngo: { id: string };
    let token: string;

    beforeAll(async () => {
      ({ ngo, token } = await createNgo('imagem', 'E2EME000000003'));
    });

    it('PNG → 200 com imageUrl de 600 px e as variantes no bucket (SIGN-09)', async () => {
      const png = await readFile(join(FIXTURES, 'photo.png'));

      const res = await as(token).image(png, 'logo.png').expect(200);

      expect(res.body.imageUrl).toMatch(
        new RegExp(`^/img/ngos/${ngo.id}/logo/[0-9a-f-]{36}-600\\.webp$`),
      );
      const logos = storage
        .keys()
        .filter((key) => key.startsWith(`ngos/${ngo.id}/logo/`));
      expect(logos).toHaveLength(2);
    });

    it('HEIC → 400 "Envie JPG, PNG ou WebP de até 1 MB." (SIGN-10)', async () => {
      const heic = await readFile(join(FIXTURES, 'photo.heic'));

      const res = await as(token).image(heic, 'logo.heic').expect(400);

      expect(res.body.message).toBe('Envie JPG, PNG ou WebP de até 1 MB.');
    });

    it('arquivo acima do limite → 413 "O arquivo passa de 1 MB." (DEMO-11)', async () => {
      const res = await as(token)
        .image(Buffer.alloc(MB + 1), 'logo.png')
        .expect(413);

      expect(res.body.message).toBe('O arquivo passa de 1 MB.');
    });
  });

  describe('DELETE /api/v1/me/ngo', () => {
    it('senha errada → 403 "Senha atual incorreta." e nada apagado (PROF-07)', async () => {
      const { ngo, token } = await createNgo('senha-errada', 'E2EME000000004');

      const res = await as(token).delete({ password: 'errada123' }).expect(403);

      expect(res.body.message).toBe('Senha atual incorreta.');
      expect(await prisma.ngo.count({ where: { id: ngo.id } })).toBe(1);
      expect(
        storage.keys().filter((key) => key.startsWith(`ngos/${ngo.id}/`)),
      ).toHaveLength(2);
    });

    it('sem password → 400', async () => {
      const { token } = await createNgo('sem-senha', 'E2EME000000005');

      await as(token).delete({}).expect(400);
    });

    it('bucket fora → 503 e nada apagado no banco', async () => {
      const { ngo, token } = await createNgo('bucket-fora', 'E2EME000000006');
      vi.spyOn(storage, 'deletePrefix').mockRejectedValueOnce(
        new Error('bucket down'),
      );

      const res = await as(token).delete({ password: PASSWORD }).expect(503);

      expect(res.body.message).toBe(
        'Não foi possível excluir agora. Tente de novo.',
      );
      expect(await prisma.ngo.count({ where: { id: ngo.id } })).toBe(1);
      expect(await prisma.animal.count({ where: { ngoId: ngo.id } })).toBe(1);
    });

    it('senha certa → apaga ONG, horários, animais, sessões e o prefixo ngos/{id}/ (PROF-08)', async () => {
      const { ngo, token } = await createNgo('excluir', 'E2EME000000007');
      const other = await createNgo('vizinha', 'E2EME000000008');

      await as(token).delete({ password: PASSWORD }).expect(204);

      expect(await prisma.ngo.count({ where: { id: ngo.id } })).toBe(0);
      expect(
        await prisma.openingHours.count({ where: { ngoId: ngo.id } }),
      ).toBe(0);
      expect(await prisma.animal.count({ where: { ngoId: ngo.id } })).toBe(0);
      expect(await prisma.animalImage.count({ where: { ngoId: ngo.id } })).toBe(
        0,
      );
      expect(await prisma.session.count({ where: { ngoId: ngo.id } })).toBe(0);
      expect(
        storage.keys().filter((key) => key.startsWith(`ngos/${ngo.id}/`)),
      ).toEqual([]);
      // Another NGO's objects stay.
      expect(
        storage.keys().filter((key) => key.startsWith(`ngos/${other.ngo.id}/`)),
      ).toHaveLength(2);
      // The session went with the NGO.
      await as(token).get().expect(401);
    });
  });
});
