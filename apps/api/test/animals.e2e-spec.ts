import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

// Small quotas keep the limits cheap to reach. Set before AppModule validates the env.
vi.hoisted(() => {
  Object.assign(process.env, {
    THROTTLE_LIMIT: '1000',
    DEMO_MODE: 'true',
    DEMO_MAX_ANIMALS_PER_NGO: '3',
    DEMO_MAX_IMAGES_PER_ANIMAL: '3',
  });
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { PrismaService } = await import('@/common/prisma/prisma.service.js');
const { InMemoryObjectStorage, IObjectStorage } =
  await import('@/modules/media/adapters/object-storage.js');
const { SessionsService } =
  await import('@/modules/sessions/services/sessions.service.js');
const { apiClient } = await import('./helpers/api-client.js');

const FIXTURES = join(import.meta.dirname, 'fixtures');
const PREFIX = 'e2e-animals-';
const MISSING = '00000000-0000-4000-8000-000000000000';

const ANIMAL = {
  name: 'Caramelo',
  species: 'DOG',
  breed: 'SRD (vira-lata)',
  sex: 'MALE',
  size: 'MEDIUM',
  ageValue: 3,
  ageUnit: 'YEARS',
  description: 'Brincalhão e dócil.',
};

// Requires the database: docker compose up -d database
describe('Animais (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InstanceType<typeof PrismaService>;
  const storage = new InMemoryObjectStorage();
  let png: Buffer;

  async function removeTestNgos() {
    await prisma.ngo.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  }

  async function createNgo(name: string, cnpj: string, status = 'ACTIVE') {
    const ngo = await prisma.ngo.create({
      data: {
        cnpj,
        legalName: `ONG ${name}`,
        slug: `${PREFIX}${name}`,
        description: 'Criada pelo e2e de animais.',
        email: `${PREFIX}${name}@example.com`,
        whatsapp: '5511987654321',
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
        status: status as 'ACTIVE' | 'SUSPENDED',
        termsAcceptedAt: new Date(),
        termsVersion: '2026-10-demo',
      },
    });
    const { token } = await app.get(SessionsService).create(ngo.id);
    return { ngo, token, as: client(token) };
  }

  const client = (token: string) => {
    const auth = { Authorization: `Bearer ${token}` };
    return {
      upload: async (): Promise<string> => {
        const res = await apiClient(app)
          .post('/api/v1/me/images')
          .set(auth)
          .attach('file', png, 'foto.png')
          .expect(201);
        return res.body.id as string;
      },
      list: (query = '') =>
        apiClient(app).get(`/api/v1/me/animals${query}`).set(auth),
      create: (body: object) =>
        apiClient(app).post('/api/v1/me/animals').set(auth).send(body),
      update: (id: string, body: object) =>
        apiClient(app).patch(`/api/v1/me/animals/${id}`).set(auth).send(body),
      availability: (id: string, available: unknown) =>
        apiClient(app)
          .patch(`/api/v1/me/animals/${id}/availability`)
          .set(auth)
          .send({ available }),
      delete: (id: string) =>
        apiClient(app).delete(`/api/v1/me/animals/${id}`).set(auth),
    };
  };

  const getPublic = (id: string, slug: string) =>
    apiClient(app).get(`/api/v1/animals/${id}?slug=${slug}`);

  const keysOf = (ngoId: string) =>
    storage.keys().filter((key) => key.startsWith(`ngos/${ngoId}/images/`));

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
    png = await readFile(join(FIXTURES, 'photo.png'));
    await removeTestNgos();
  });

  afterAll(async () => {
    await removeTestNgos();
    await app.close();
  });

  describe('sem sessão', () => {
    it.each([
      ['GET', () => apiClient(app).get('/api/v1/me/animals')],
      ['POST', () => apiClient(app).post('/api/v1/me/animals').send(ANIMAL)],
      [
        'PATCH',
        () => apiClient(app).patch(`/api/v1/me/animals/${MISSING}`).send({}),
      ],
      [
        'PATCH availability',
        () =>
          apiClient(app)
            .patch(`/api/v1/me/animals/${MISSING}/availability`)
            .send({ available: false }),
      ],
      ['DELETE', () => apiClient(app).delete(`/api/v1/me/animals/${MISSING}`)],
    ])('%s → 401 (AUTH-07)', async (_method, call) => {
      await call().expect(401);
    });
  });

  describe('ciclo de vida do animal', () => {
    let a: Awaited<ReturnType<typeof createNgo>>;

    beforeAll(async () => {
      a = await createNgo('a', 'E2EANI00000001');
    });

    it('criar com 2 fotos pendentes → disponível e visível em GET /animals/:id com a capa primeiro (AFORM-01, ANI-01, ANI-02)', async () => {
      const [first, second] = [await a.as.upload(), await a.as.upload()];

      const created = await a.as
        .create({ ...ANIMAL, imageIds: [second, first] })
        .expect(201);

      expect(created.body).toMatchObject({ ...ANIMAL, available: true });
      const res = await getPublic(created.body.id, a.ngo.slug).expect(200);
      expect(res.body).toMatchObject({
        id: created.body.id,
        name: 'Caramelo',
        available: true,
        ngo: { slug: a.ngo.slug, name: 'ONG a' },
      });
      expect(res.body.images.map((image: { id: string }) => image.id)).toEqual([
        second,
        first,
      ]);
      expect(res.body.images[0]).toMatchObject({
        url: `/img/ngos/${a.ngo.id}/images/${second}-1200.webp`,
        thumbUrl: `/img/ngos/${a.ngo.id}/images/${second}-160.webp`,
        alt: 'Caramelo, cão, porte médio',
      });
      expect(res.body.whatsappUrl).toBe(
        `https://wa.me/5511987654321?text=${encodeURIComponent(
          'Olá! Vi o Caramelo no Animal Helper e quero saber como adotar.',
        )}`,
      );
      // SEC-04: the public NGO summary has no private fields.
      expect(JSON.stringify(res.body)).not.toMatch(
        /"(email|cnpj|passwordHash)"/,
      );
      expect(
        await prisma.animalImage.findMany({
          where: { animalId: created.body.id },
          orderBy: { position: 'asc' },
          select: { id: true, position: true },
        }),
      ).toEqual([
        { id: second, position: 0 },
        { id: first, position: 1 },
      ]);
    });

    it('sem fotos → 400 "Adicione pelo menos 1 foto." (AFORM-05)', async () => {
      const res = await a.as.create({ ...ANIMAL, imageIds: [] }).expect(400);

      expect(res.body.message).toContain('Adicione pelo menos 1 foto.');
    });

    it('nome com 61 caracteres → 400 e nada criado (AFORM-02)', async () => {
      const before = await prisma.animal.count({ where: { ngoId: a.ngo.id } });
      const photo = await a.as.upload();

      await a.as
        .create({ ...ANIMAL, name: 'a'.repeat(61), imageIds: [photo] })
        .expect(400);

      expect(await prisma.animal.count({ where: { ngoId: a.ngo.id } })).toBe(
        before,
      );
    });

    it('4ª foto com limite de 3 → 409 com a mensagem do DEMO-10', async () => {
      const ids = [
        await a.as.upload(),
        await a.as.upload(),
        await a.as.upload(),
        await a.as.upload(),
      ];

      const res = await a.as.create({ ...ANIMAL, imageIds: ids }).expect(409);

      expect(res.body.message).toBe(
        'Este animal já tem o máximo de 3 fotos da demo.',
      );
    });

    it('editar reflete no público, e a foto removida sai do banco e do bucket (AFORM-13, AFORM-14)', async () => {
      const [keep, drop] = [await a.as.upload(), await a.as.upload()];
      const created = await a.as
        .create({ ...ANIMAL, name: 'Bolinha', imageIds: [keep, drop] })
        .expect(201);
      expect(keysOf(a.ngo.id).filter((k) => k.includes(drop))).toHaveLength(2);

      const res = await a.as
        .update(created.body.id, {
          name: 'Bolinha Nova',
          ageValue: 4,
          imageIds: [keep],
        })
        .expect(200);

      expect(res.body).toMatchObject({ name: 'Bolinha Nova', ageValue: 4 });
      const pub = await getPublic(created.body.id, a.ngo.slug).expect(200);
      expect(pub.body.name).toBe('Bolinha Nova');
      expect(pub.body.images.map((image: { id: string }) => image.id)).toEqual([
        keep,
      ]);
      expect(await prisma.animalImage.count({ where: { id: drop } })).toBe(0);
      expect(keysOf(a.ngo.id).filter((k) => k.includes(drop))).toEqual([]);
      expect(keysOf(a.ngo.id).filter((k) => k.includes(keep))).toHaveLength(2);

      await a.as.delete(created.body.id).expect(204);
    });

    it('trocar a disponibilidade grava availableChangedAt e tira o wa.me do público (DASH-02, ANI-05)', async () => {
      const created = await a.as
        .create({ ...ANIMAL, name: 'Pipoca', imageIds: [await a.as.upload()] })
        .expect(201);
      const before = await prisma.animal.findUniqueOrThrow({
        where: { id: created.body.id },
      });

      const res = await a.as.availability(created.body.id, false).expect(200);

      expect(res.body.available).toBe(false);
      const after = await prisma.animal.findUniqueOrThrow({
        where: { id: created.body.id },
      });
      expect(after.available).toBe(false);
      expect(after.availableChangedAt.getTime()).toBeGreaterThan(
        before.availableChangedAt.getTime(),
      );
      expect(new Date(res.body.availableChangedAt)).toEqual(
        after.availableChangedAt,
      );
      const pub = await getPublic(created.body.id, a.ngo.slug).expect(200);
      expect(pub.body).toMatchObject({ available: false, whatsappUrl: null });

      await a.as.availability(created.body.id, 'sim').expect(400);
      await a.as.delete(created.body.id).expect(204);
    });

    it('excluir → GET /animals/:id 404 e as fotos fora do banco e do bucket (AFORM-16, AFORM-17)', async () => {
      const photos = [await a.as.upload(), await a.as.upload()];
      const created = await a.as
        .create({ ...ANIMAL, name: 'Tufão', imageIds: photos })
        .expect(201);
      const keys = keysOf(a.ngo.id).filter((key) =>
        photos.some((id) => key.includes(id)),
      );
      expect(keys).toHaveLength(4);

      await a.as.delete(created.body.id).expect(204);

      await getPublic(created.body.id, a.ngo.slug).expect(404);
      expect(
        await prisma.animal.count({ where: { id: created.body.id } }),
      ).toBe(0);
      expect(
        await prisma.animalImage.count({ where: { id: { in: photos } } }),
      ).toBe(0);
      expect(storage.keys().filter((key) => keys.includes(key))).toEqual([]);
    });

    it('bucket fora ao excluir → 503 e o animal fica, com as fotos (design: erros)', async () => {
      const photo = await a.as.upload();
      const created = await a.as
        .create({ ...ANIMAL, name: 'Fica', imageIds: [photo] })
        .expect(201);
      vi.spyOn(storage, 'deleteKeys').mockRejectedValueOnce(
        new Error('bucket down'),
      );

      const res = await a.as.delete(created.body.id).expect(503);

      expect(res.body.message).toBe(
        'Não foi possível excluir agora. Tente de novo.',
      );
      expect(
        await prisma.animal.count({ where: { id: created.body.id } }),
      ).toBe(1);
      expect(await prisma.animalImage.count({ where: { id: photo } })).toBe(1);
      await getPublic(created.body.id, a.ngo.slug).expect(200);

      await a.as.delete(created.body.id).expect(204);
    });
  });

  describe('leitura pública (ANI-06)', () => {
    let a: Awaited<ReturnType<typeof createNgo>>;
    let animalId: string;

    beforeAll(async () => {
      a = await createNgo('publica', 'E2EANI00000002');
      const created = await a.as
        .create({ ...ANIMAL, imageIds: [await a.as.upload()] })
        .expect(201);
      animalId = created.body.id;
    });

    it('id de outro slug → 404', async () => {
      await getPublic(animalId, `${PREFIX}outra`).expect(404);
    });

    it('id inexistente ou malformado → 404', async () => {
      const res = await getPublic(MISSING, a.ngo.slug).expect(404);
      expect(res.body.message).toBe('Animal não encontrado.');
      await getPublic('nao-e-uuid', a.ngo.slug).expect(404);
    });

    it('sem slug → 400', async () => {
      await apiClient(app).get(`/api/v1/animals/${animalId}`).expect(400);
    });

    it('ONG suspensa → 404', async () => {
      await prisma.ngo.update({
        where: { id: a.ngo.id },
        data: { status: 'SUSPENDED' },
      });

      await getPublic(animalId, a.ngo.slug).expect(404);

      await prisma.ngo.update({
        where: { id: a.ngo.id },
        data: { status: 'ACTIVE' },
      });
      await getPublic(animalId, a.ngo.slug).expect(200);
    });
  });

  describe('painel: busca e filtros', () => {
    let p: Awaited<ReturnType<typeof createNgo>>;

    beforeAll(async () => {
      p = await createNgo('painel', 'E2EANI00000003');
      const names = [
        ['João', 'DOG', true],
        ['Joana', 'CAT', true],
        ['Mel', 'CAT', false],
      ] as const;
      for (const [name, species, available] of names) {
        const created = await p.as
          .create({ ...ANIMAL, name, species, imageIds: [await p.as.upload()] })
          .expect(201);
        if (!available) {
          await p.as.availability(created.body.id, false).expect(200);
        }
      }
      // Another NGO's animal never shows up.
      const other = await createNgo('vizinha', 'E2EANI00000004');
      await other.as
        .create({
          ...ANIMAL,
          name: 'João',
          imageIds: [await other.as.upload()],
        })
        .expect(201);
    });

    const names = async (query: string) => {
      const res = await p.as.list(query).expect(200);
      return (res.body as { name: string }[]).map((a) => a.name).sort();
    };

    it('lista só os animais da ONG da sessão, com capa e dados do card (DASH-01)', async () => {
      const res = await p.as.list().expect(200);

      expect(res.body).toHaveLength(3);
      expect(res.body[0]).toMatchObject({
        species: expect.any(String),
        sex: 'MALE',
        size: 'MEDIUM',
        ageValue: 3,
        ageUnit: 'YEARS',
      });
      expect(res.body[0].images[0].thumbUrl).toMatch(/-160\.webp$/);
    });

    it('busca "joao" acha "João", sem acento e sem caixa (DASH-04)', async () => {
      expect(await names('?search=joao')).toEqual(['João']);
      expect(await names('?search=JOA')).toEqual(['Joana', 'João']);
      expect(await names('?search=%25')).toEqual([]);
    });

    it.each([
      ['all', ['Joana', 'João', 'Mel']],
      ['dogs', ['João']],
      ['cats', ['Joana', 'Mel']],
      ['available', ['Joana', 'João']],
      ['unavailable', ['Mel']],
    ])('filtro %s (DASH-05)', async (filter, expected) => {
      expect(await names(`?filter=${filter}`)).toEqual(expected);
    });

    it('filtro e busca juntos; filtro inválido → 400', async () => {
      expect(await names('?filter=cats&search=jo')).toEqual(['Joana']);
      await p.as.list('?filter=birds').expect(400);
    });
  });

  describe('isolamento entre ONGs (SEC-05, SEC-06)', () => {
    let a: Awaited<ReturnType<typeof createNgo>>;
    let b: Awaited<ReturnType<typeof createNgo>>;
    let animalId: string;

    beforeAll(async () => {
      a = await createNgo('dona', 'E2EANI00000005');
      b = await createNgo('intrusa', 'E2EANI00000006');
      const created = await a.as
        .create({ ...ANIMAL, imageIds: [await a.as.upload()] })
        .expect(201);
      animalId = created.body.id;
    });

    it('ONG B editando animal da ONG A → 404 e nada muda', async () => {
      await b.as.update(animalId, { name: 'Roubado' }).expect(404);
      await b.as.availability(animalId, false).expect(404);
      await b.as.delete(animalId).expect(404);

      const row = await prisma.animal.findUniqueOrThrow({
        where: { id: animalId },
      });
      expect(row).toMatchObject({ name: 'Caramelo', available: true });
      expect((await b.as.list().expect(200)).body).toEqual([]);
    });

    it('ONG B não usa foto da ONG A → 404', async () => {
      const photo = await a.as.upload();

      await b.as.create({ ...ANIMAL, imageIds: [photo] }).expect(404);

      expect(await prisma.animal.count({ where: { ngoId: b.ngo.id } })).toBe(0);
    });

    it('ngoId no corpo → 400: a ONG vem só do token', async () => {
      await b.as
        .create({
          ...ANIMAL,
          ngoId: a.ngo.id,
          imageIds: [await b.as.upload()],
        })
        .expect(400);
    });
  });

  describe('cota de animais (DEMO-09, DEMO-13)', () => {
    it('5 criações em paralelo com 1 vaga → 1 animal criado, 4 recusas 409', async () => {
      const c = await createNgo('cota', 'E2EANI00000007');
      for (const name of ['Um', 'Dois']) {
        await c.as
          .create({ ...ANIMAL, name, imageIds: [await c.as.upload()] })
          .expect(201);
      }
      const photos = [];
      for (let i = 0; i < 5; i++) {
        photos.push(await c.as.upload());
      }

      const results = await Promise.all(
        photos.map((photo, i) =>
          c.as.create({ ...ANIMAL, name: `Paralelo ${i}`, imageIds: [photo] }),
        ),
      );

      expect(results.map((res) => res.status).sort((x, y) => x - y)).toEqual([
        201, 409, 409, 409, 409,
      ]);
      expect(results.find((res) => res.status === 409)?.body.message).toBe(
        'Sua ONG atingiu o limite de 3 animais da demo. Exclua um animal para cadastrar outro.',
      );
      expect(await prisma.animal.count({ where: { ngoId: c.ngo.id } })).toBe(3);
    });
  });
});
