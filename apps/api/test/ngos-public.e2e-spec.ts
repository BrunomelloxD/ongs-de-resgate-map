import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

// Many requests from one IP in this file; set before AppModule validates the env.
vi.hoisted(() => {
  process.env['THROTTLE_LIMIT'] = '1000';
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { PrismaService } = await import('@/common/prisma/prisma.service.js');
const { apiClient } = await import('./helpers/api-client.js');

type Prisma = InstanceType<typeof PrismaService>;

const PREFIX = 'e2e-pub-';
// Areas in the South Atlantic, where no seed or other e2e NGO lives.
const AREA = { lat: -30.5, lng: -10.5 };
const AREA_BBOX = '-10.60,-30.60,-10.40,-30.40';
const CROWDED = { lat: -31.5, lng: -12.5 };
const CROWDED_BBOX = '-12.60,-31.60,-12.40,-31.40';
const FORBIDDEN_KEYS = ['"email"', '"cnpj"', '"passwordHash"'];

function ngoData(name: string, i: number, at: { lat: number; lng: number }) {
  return {
    cnpj: `E2EPUB${String(i).padStart(8, '0')}`,
    legalName: `ONG ${name}`,
    slug: `${PREFIX}${name}`,
    description: 'Criada pelo e2e das rotas públicas de ONGs.',
    email: `${PREFIX}${name}@example.com`,
    whatsapp: '5511987654321',
    passwordHash: 'x',
    cep: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    district: 'Bela Vista',
    city: 'São Paulo',
    uf: 'SP',
    lat: at.lat,
    lng: at.lng,
    locationConfirmedAt: new Date(),
    timezone: 'America/Sao_Paulo',
    termsAcceptedAt: new Date(),
    termsVersion: '2026-10-demo',
  };
}

const ALL_DAYS_OPEN = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  closed: false,
  opensAt: '00:00',
  closesAt: '23:59',
}));

function animal(
  ngoId: string,
  name: string,
  overrides: Partial<{
    species: 'DOG' | 'CAT';
    sex: 'MALE' | 'FEMALE';
    size: 'SMALL' | 'MEDIUM' | 'LARGE';
    available: boolean;
    createdAt: Date;
  }> = {},
) {
  return {
    ngoId,
    name,
    species: 'DOG' as const,
    sex: 'MALE' as const,
    size: 'MEDIUM' as const,
    ageValue: 2,
    ageUnit: 'YEARS' as const,
    ...overrides,
  };
}

async function removeTestNgos(prisma: Prisma) {
  await prisma.ngo.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

// Requires the database: docker compose up -d database
describe('Rotas públicas de ONGs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: Prisma;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await removeTestNgos(prisma);

    // "center" sits on the bbox center; "edge" is farther from it.
    const create = async (
      name: string,
      i: number,
      at: { lat: number; lng: number },
      extra: Record<string, unknown> = {},
    ) => {
      const ngo = await prisma.ngo.create({
        data: {
          ...ngoData(name, i, at),
          ...extra,
          openingHours: { create: ALL_DAYS_OPEN },
        },
      });
      ids[name] = ngo.id;
    };
    await create('edge', 1, { lat: AREA.lat + 0.08, lng: AREA.lng + 0.08 });
    await create('center', 2, AREA);
    await create('suspensa', 3, AREA, { status: 'SUSPENDED' });
    await create('vazia', 4, { lat: AREA.lat - 0.05, lng: AREA.lng });
    await create('fora', 5, { lat: AREA.lat + 1, lng: AREA.lng });

    // center: an available cat; edge: an available dog and an unavailable cat.
    await prisma.animal.create({
      data: animal(ids.center, 'Mel', {
        species: 'CAT',
        sex: 'FEMALE',
        size: 'SMALL',
      }),
    });
    await prisma.animal.create({ data: animal(ids.edge, 'Rex') });
    await prisma.animal.create({
      data: animal(ids.edge, 'Nina', { species: 'CAT', available: false }),
    });
    await prisma.animal.create({
      data: animal(ids.suspensa, 'Bob', { species: 'CAT' }),
    });

    // 201 active NGOs in another area, to cross the 200 limit.
    await prisma.ngo.createMany({
      data: Array.from({ length: 201 }, (_, i) => ({
        ...ngoData(`lote-${i}`, 100 + i, {
          lat: CROWDED.lat + i * 0.0001,
          lng: CROWDED.lng,
        }),
      })),
    });
  });

  afterAll(async () => {
    await removeTestNgos(prisma);
    await app.close();
  });

  const search = (query: string) => apiClient(app).get(`/api/v1/ngos?${query}`);

  function slugsOf(body: { items: { slug: string }[] }) {
    return body.items.map((item) => item.slug);
  }

  describe('GET /api/v1/ngos', () => {
    it('bbox com ONGs ativas e uma suspensa devolve só as ativas, a do centro primeiro (MAP-02, MAP-20)', async () => {
      const res = await search(`bbox=${AREA_BBOX}`).expect(200);

      expect(slugsOf(res.body)).toEqual([
        `${PREFIX}center`,
        `${PREFIX}vazia`,
        `${PREFIX}edge`,
      ]);
      expect(res.body.truncated).toBe(false);
      expect(res.headers['cache-control']).toBe('public, s-maxage=60');
    });

    it('cada pino tem só os campos do MAP-18', async () => {
      const res = await search(`bbox=${AREA_BBOX}`).expect(200);

      const pin = res.body.items[0];
      expect(Object.keys(pin).sort()).toEqual(
        [
          'id',
          'lat',
          'lng',
          'name',
          'openNow',
          'slug',
          'thumbUrl',
          'todayHours',
        ].sort(),
      );
      expect(pin).toEqual({
        id: ids.center,
        slug: `${PREFIX}center`,
        name: 'ONG center',
        lat: AREA.lat,
        lng: AREA.lng,
        openNow: expect.any(Boolean),
        todayHours: { closed: false, opensAt: '00:00', closesAt: '23:59' },
        thumbUrl: null,
      });
    });

    it('species=DOG só traz quem tem cão disponível; CAT indisponível não conta (MAPF-03)', async () => {
      const dogs = await search(`bbox=${AREA_BBOX}&species=DOG`).expect(200);
      const cats = await search(`bbox=${AREA_BBOX}&species=CAT`).expect(200);

      expect(slugsOf(dogs.body)).toEqual([`${PREFIX}edge`]);
      expect(slugsOf(cats.body)).toEqual([`${PREFIX}center`]);
    });

    it('species=DOG,CAT é a união das duas espécies (MAPF-03)', async () => {
      const res = await search(`bbox=${AREA_BBOX}&species=DOG,CAT`).expect(200);

      expect(slugsOf(res.body)).toEqual([`${PREFIX}center`, `${PREFIX}edge`]);
    });

    it('bbox com 201 ONGs → as 200 mais próximas do centro e truncated: true (MAP-18)', async () => {
      const res = await search(`bbox=${CROWDED_BBOX}`).expect(200);

      expect(res.body.truncated).toBe(true);
      expect(res.body.items).toHaveLength(200);
      // lote-200 is the farthest from the center (-31.5): it is the one left out.
      expect(slugsOf(res.body)).not.toContain(`${PREFIX}lote-200`);
      expect(slugsOf(res.body)[0]).toBe(`${PREFIX}lote-0`);
    });

    it.each([
      ['sem bbox', ''],
      ['bbox com 3 números', 'bbox=-10.6,-30.6,-10.4'],
      ['bbox com texto', 'bbox=a,b,c,d'],
      ['bbox invertida', 'bbox=-10.4,-30.6,-10.6,-30.4'],
      ['bbox fora do globo', 'bbox=-200,-30.6,-10.4,-30.4'],
      ['espécie inválida', `bbox=${AREA_BBOX}&species=BIRD`],
      ['parâmetro desconhecido', `bbox=${AREA_BBOX}&lat=-23`],
    ])('%s → 400', async (_case, query) => {
      await search(query).expect(400);
    });
  });

  describe('GET /api/v1/ngos/:slug', () => {
    it('ONG ativa → 200 com a página e o header de cache (NGO-01, PERF-03)', async () => {
      const res = await apiClient(app)
        .get(`/api/v1/ngos/${PREFIX}edge`)
        .expect(200);

      expect(res.headers['cache-control']).toBe('public, s-maxage=60');
      expect(res.body).toMatchObject({
        id: ids.edge,
        slug: `${PREFIX}edge`,
        name: 'ONG edge',
        imageUrl: null,
        whatsappUrl: `https://wa.me/5511987654321?text=${encodeURIComponent('Olá! Vi a ONG edge no Animal Helper.')}`,
        address: { cep: '01310100', city: 'São Paulo', uf: 'SP' },
        hasAnimals: true,
      });
      expect(res.body.weekHours).toHaveLength(7);
      expect(res.body.todayIndex).toEqual(expect.any(Number));
    });

    it('ONG ativa sem animais → hasAnimals: false (NGO-08)', async () => {
      const res = await apiClient(app)
        .get(`/api/v1/ngos/${PREFIX}vazia`)
        .expect(200);

      expect(res.body.hasAnimals).toBe(false);
    });

    it('slug inexistente → 404 (NGO-11)', async () => {
      const res = await apiClient(app)
        .get(`/api/v1/ngos/${PREFIX}nao-existe`)
        .expect(404);

      expect(res.body.message).toBe('ONG não encontrada.');
    });

    it('slug de ONG suspensa → 404 (NGO-11)', async () => {
      await apiClient(app).get(`/api/v1/ngos/${PREFIX}suspensa`).expect(404);
    });
  });

  describe('GET /api/v1/ngos/:slug/animals', () => {
    const list = (slug: string, query = '') =>
      apiClient(app).get(`/api/v1/ngos/${PREFIX}${slug}/animals?${query}`);

    it('só disponíveis por padrão (NGO-05)', async () => {
      const res = await list('edge').expect(200);

      expect(res.body.data.map((a: { name: string }) => a.name)).toEqual([
        'Rex',
      ]);
      expect(res.body.meta).toEqual({
        total: 1,
        page: 1,
        limit: 12,
        last_page: 1,
      });
      expect(res.headers['cache-control']).toBe('public, s-maxage=60');
    });

    it('available=false traz também os indisponíveis (NGO-07)', async () => {
      const res = await list('edge', 'available=false').expect(200);

      expect(res.body.data.map((a: { name: string }) => a.name).sort()).toEqual(
        ['Nina', 'Rex'],
      );
      expect(
        res.body.data.find((a: { name: string }) => a.name === 'Nina')
          .available,
      ).toBe(false);
    });

    it('espécie, sexo e porte combinados (NGO-06)', async () => {
      const match = await list('center', 'species=CAT&sex=FEMALE&size=SMALL');
      const miss = await list('center', 'species=CAT&sex=MALE');

      expect(match.body.data.map((a: { name: string }) => a.name)).toEqual([
        'Mel',
      ]);
      expect(miss.body.data).toEqual([]);
    });

    it('12 por página (NGO-10)', async () => {
      await prisma.animal.createMany({
        data: Array.from({ length: 12 }, (_, i) =>
          animal(ids.vazia, `Filhote ${i}`),
        ),
      });

      const first = await list('vazia').expect(200);
      const second = await list('vazia', 'page=2').expect(200);

      expect(first.body.data).toHaveLength(12);
      expect(second.body.data).toHaveLength(0);
      expect(first.body.meta).toEqual({
        total: 12,
        page: 1,
        limit: 12,
        last_page: 1,
      });
      await prisma.animal.deleteMany({ where: { ngoId: ids.vazia } });
    });

    it.each([
      ['espécie inválida', 'species=BIRD'],
      ['available inválido', 'available=sim'],
      ['página 0', 'page=0'],
      ['limit não é aceito', 'limit=50'],
    ])('%s → 400', async (_case, query) => {
      await list('edge', query).expect(400);
    });

    it('slug de ONG suspensa → 404 (NGO-11)', async () => {
      await list('suspensa').expect(404);
    });
  });

  it('nenhuma resposta pública contém email, cnpj ou passwordHash (SEC-04)', async () => {
    const responses = await Promise.all([
      search(`bbox=${AREA_BBOX}`),
      apiClient(app).get(`/api/v1/ngos/${PREFIX}edge`),
      apiClient(app).get(`/api/v1/ngos/${PREFIX}edge/animals?available=false`),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(200);
      for (const key of FORBIDDEN_KEYS) {
        expect(res.text).not.toContain(key);
      }
      expect(res.text).not.toContain('E2EPUB');
      expect(res.text).not.toContain('@example.com');
    }
  });
});
