import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import type { App } from 'supertest/types.js';

// Own file: a 1 MB limit keeps the oversized upload small. Set before AppModule validates the env.
vi.hoisted(() => {
  Object.assign(process.env, { DEMO_MODE: 'true', DEMO_MAX_UPLOAD_MB: '1' });
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { PrismaService } = await import('@/common/prisma/prisma.service.js');
const { InMemoryObjectStorage, IObjectStorage } =
  await import('@/modules/media/adapters/object-storage.js');
const { SessionsService } =
  await import('@/modules/sessions/services/sessions.service.js');
const { apiClient } = await import('./helpers/api-client.js');

const MB = 1024 * 1024;
const FIXTURES = join(import.meta.dirname, 'fixtures');
const SLUG = 'e2e-media-ngo';
const MISSING_NGO = '00000000-0000-4000-8000-000000000000';

// Requires the database: docker compose up -d database
describe('Media (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InstanceType<typeof PrismaService>;
  const storage = new InMemoryObjectStorage();
  let ngoId: string;
  let token: string;

  async function removeTestNgo() {
    await prisma.ngo.deleteMany({ where: { slug: SLUG } });
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
    await removeTestNgo();
    const ngo = await prisma.ngo.create({
      data: {
        cnpj: 'E2EMEDIA000001',
        legalName: 'ONG e2e media',
        slug: SLUG,
        description: 'Criada pelo e2e de media.',
        email: 'e2e-media@example.com',
        whatsapp: '5511999990000',
        passwordHash: 'x',
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
        termsAcceptedAt: new Date(),
        termsVersion: '2026-10-20',
      },
    });
    ngoId = ngo.id;
    ({ token } = await app.get(SessionsService).create(ngoId));
  });

  afterAll(async () => {
    await removeTestNgo();
    await app.close();
  });

  function upload(file: Buffer, name = 'foto.jpg') {
    return apiClient(app)
      .post('/api/v1/me/images')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, name);
  }

  describe('POST /api/v1/me/images', () => {
    it('JPG com GPS → 201 e 3 variantes WebP (160, 600 e 1200) sem EXIF, pendente no banco (SEC-07, AFORM-12, T174)', async () => {
      const input = await readFile(join(FIXTURES, 'photo-gps.jpg'));

      const res = await upload(input).expect(201);

      const prefix = `ngos/${ngoId}/images/${res.body.id}`;
      expect(res.body).toEqual({
        id: res.body.id,
        thumbUrl: `/img/${prefix}-160.webp`,
        width: expect.any(Number),
        height: expect.any(Number),
      });
      const keys = storage.keys().filter((key) => key.startsWith(prefix));
      expect(keys).toEqual([
        `${prefix}-1200.webp`,
        `${prefix}-160.webp`,
        `${prefix}-600.webp`,
      ]);
      for (const key of keys) {
        const body = Buffer.concat(
          await (await storage.getStream(key)).toArray(),
        );
        const meta = await sharp(body).metadata();
        expect(meta.format).toBe('webp');
        expect(meta.exif).toBeUndefined();
        expect(body.includes('FixtureCam')).toBe(false);
      }
      const row = await prisma.animalImage.findUniqueOrThrow({
        where: { id: res.body.id },
      });
      expect(row).toMatchObject({
        ngoId,
        animalId: null,
        position: null,
        keyPrefix: prefix,
        width: res.body.width,
        height: res.body.height,
      });
    });

    it('arquivo acima de DEMO_MAX_UPLOAD_MB → 413 "O arquivo passa de 1 MB." (DEMO-11)', async () => {
      const before = storage.keys().length;

      const res = await upload(Buffer.alloc(MB + 1)).expect(413);

      expect(res.body.message).toBe('O arquivo passa de 1 MB.');
      expect(storage.keys()).toHaveLength(before);
    });

    it('tipo inválido → 400 "Envie JPG, PNG, WebP ou HEIC de até 1 MB." (AFORM-08)', async () => {
      const gif = await readFile(join(FIXTURES, 'animation.gif'));

      const res = await upload(gif, 'foto.jpg').expect(400);

      expect(res.body.message).toBe(
        'Envie JPG, PNG, WebP ou HEIC de até 1 MB.',
      );
    });

    it('sem sessão → 401', async () => {
      const input = await readFile(join(FIXTURES, 'photo.png'));

      await apiClient(app)
        .post('/api/v1/me/images')
        .attach('file', input, 'foto.png')
        .expect(401);
    });
  });

  describe('GET /api/v1/media/*key', () => {
    let saved: { id: string; prefix: string };

    beforeAll(async () => {
      const input = await readFile(join(FIXTURES, 'photo.webp'));
      const res = await upload(input, 'foto.webp').expect(201);
      saved = {
        id: res.body.id,
        prefix: `ngos/${ngoId}/images/${res.body.id}`,
      };
    });

    it('imagem pendente → 404', async () => {
      await apiClient(app)
        .get(`/api/v1/media/${saved.prefix}-1200.webp`)
        .expect(404);
    });

    it('foto salva de ONG ACTIVE → 200 com Content-Type image/webp (PERF-02)', async () => {
      const animal = await prisma.animal.create({
        data: {
          ngoId,
          name: 'Rex e2e',
          species: 'DOG',
          sex: 'MALE',
          size: 'MEDIUM',
          ageValue: 2,
          ageUnit: 'YEARS',
        },
      });
      await prisma.animalImage.update({
        where: { id: saved.id },
        data: { animalId: animal.id, position: 0 },
      });
      const stored = Buffer.concat(
        await (await storage.getStream(`${saved.prefix}-1200.webp`)).toArray(),
      );

      const res = await apiClient(app)
        .get(`/api/v1/media/${saved.prefix}-1200.webp`)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(res.headers['content-type']).toBe('image/webp');
      expect(Buffer.compare(res.body as Buffer, stored)).toBe(0);
    });

    it('ONG inexistente → 404', async () => {
      await apiClient(app)
        .get(`/api/v1/media/ngos/${MISSING_NGO}/images/${saved.id}-1200.webp`)
        .expect(404);
    });

    it('ONG que não está ACTIVE → 404 (SEC-06)', async () => {
      await prisma.ngo.update({
        where: { id: ngoId },
        data: { status: 'SUSPENDED' },
      });

      await apiClient(app)
        .get(`/api/v1/media/${saved.prefix}-1200.webp`)
        .expect(404);

      await prisma.ngo.update({
        where: { id: ngoId },
        data: { status: 'ACTIVE' },
      });
    });

    it.each([
      'ngos/x/images/y-160.webp',
      'qualquer-coisa.webp',
      'ngos/%2E%2E/images/a-160.webp',
    ])('chave inválida "%s" → 404', async (key) => {
      await apiClient(app).get(`/api/v1/media/${key}`).expect(404);
    });

    it('chave válida com variante inexistente → 404', async () => {
      await apiClient(app)
        .get(`/api/v1/media/${saved.prefix}-400.webp`)
        .expect(404);
    });

    it('T174: foto antiga, sem a variante de 600 no bucket, responde 200 com a de 1200', async () => {
      const large = Buffer.concat(
        await (await storage.getStream(`${saved.prefix}-1200.webp`)).toArray(),
      );
      // A photo uploaded before T174 has only 160 and 1200.
      await storage.deleteKeys([`${saved.prefix}-600.webp`]);

      const res = await apiClient(app)
        .get(`/api/v1/media/${saved.prefix}-600.webp`)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(res.headers['content-type']).toBe('image/webp');
      expect(Buffer.compare(res.body as Buffer, large)).toBe(0);
    });
  });
});
