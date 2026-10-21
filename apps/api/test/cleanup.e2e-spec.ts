import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

// Retention 0: a signup expires at once. Set before AppModule validates the env.
vi.hoisted(() => {
  Object.assign(process.env, {
    THROTTLE_LIMIT: '1000',
    DEMO_MODE: 'true',
    DEMO_RETENTION_DAYS: '0',
    DEMO_MAX_NGOS: '1000',
    DEMO_SIGNUPS_PER_IP_PER_DAY: '1000',
  });
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { runCleanup } = await import('@/app/cleanup.js');
const { PrismaService } = await import('@/common/prisma/prisma.service.js');
const { InMemoryObjectStorage, IObjectStorage } =
  await import('@/modules/media/adapters/object-storage.js');
const { apiClient } = await import('./helpers/api-client.js');

const HOUR_MS = 60 * 60 * 1000;
const DOMAIN = '@e2e-cleanup.test';
const SEED_SLUG = 'e2e-cleanup-seed';
const FIXTURES = join(import.meta.dirname, 'fixtures');

const HOURS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  closed: true,
}));

function signupBody() {
  const id = randomUUID();
  return {
    signupRequestId: id,
    // Valid check digits (same CNPJ as the e2e of the NGO profile).
    cnpj: '11222333000181',
    password: 'senha1234',
    termsAccepted: true,
    legalName: `E2E Limpeza ${id.slice(0, 8)}`,
    description: 'ONG criada pelo e2e da limpeza, com mais de 30 letras.',
    email: `${id}${DOMAIN}`,
    whatsapp: '5511987654321',
    cep: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    district: 'Bela Vista',
    city: 'São Paulo',
    uf: 'SP',
    lat: -23.5651,
    lng: -46.6519,
    locationConfirmedAt: new Date().toISOString(),
    openingHours: HOURS,
  };
}

// Requires the database: docker compose up -d database
describe('Limpeza da demo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InstanceType<typeof PrismaService>;
  const storage = new InMemoryObjectStorage();

  async function removeTestNgos() {
    await prisma.ngo.deleteMany({
      where: { OR: [{ email: { endsWith: DOMAIN } }, { slug: SEED_SLUG }] },
    });
  }

  /** Photo row plus its two variants in the bucket. */
  async function photo(
    ngoId: string,
    data: { animalId?: string; position?: number; createdAt?: Date },
  ) {
    const id = randomUUID();
    const keyPrefix = `ngos/${ngoId}/images/${id}`;
    await prisma.animalImage.create({
      data: {
        id,
        ngoId,
        keyPrefix,
        bytes: 300,
        width: 1200,
        height: 900,
        ...data,
      },
    });
    await storage.put(`${keyPrefix}-160.webp`, Buffer.alloc(100), 'image/webp');
    await storage.put(
      `${keyPrefix}-1200.webp`,
      Buffer.alloc(200),
      'image/webp',
    );
    return keyPrefix;
  }

  /** `ngos.cnpj`, `slug` and `email` are unique, so the seed is removed with the test NGOs. */
  function seedNgo() {
    return prisma.ngo.upsert({
      where: { slug: SEED_SLUG },
      update: {},
      create: {
        cnpj: '11444777000161',
        legalName: 'ONG seed do e2e da limpeza',
        slug: SEED_SLUG,
        description: 'ONG seed criada pelo e2e da limpeza.',
        email: `seed${DOMAIN}`,
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
        termsAcceptedAt: new Date(),
        termsVersion: '2026-10-demo',
        isSeed: true,
        expiresAt: null,
      },
    });
  }

  async function animal(ngoId: string) {
    return prisma.animal.create({
      data: {
        ngoId,
        name: 'Rex',
        species: 'DOG',
        sex: 'MALE',
        size: 'MEDIUM',
        ageValue: 2,
        ageUnit: 'YEARS',
      },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IObjectStorage)
      .useValue(storage)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await removeTestNgos();
  });

  afterAll(async () => {
    await removeTestNgos();
    await app.close();
  });

  it('apaga a ONG vencida do banco e do bucket, mantém a seed, e a segunda execução termina com zeros (DEMO-14 a DEMO-19)', async () => {
    // The NGO signs up with retention 0, so it has already expired (DEMO-04).
    const signup = await apiClient(app)
      .post('/api/v1/ngos')
      .set('X-Client-IP', '198.51.100.77')
      .send(signupBody())
      .expect(201);
    const ngoId: string = signup.body.ngo.id;
    const token: string = signup.body.token;
    const upload = await apiClient(app)
      .post('/api/v1/me/images')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', await readFile(join(FIXTURES, 'photo.png')), 'foto.png')
      .expect(201);
    expect(upload.body.id).toEqual(expect.any(String));
    const saved = await animal(ngoId);
    const savedPrefix = await photo(ngoId, { animalId: saved.id, position: 0 });

    // A seed never expires, even with an old pending photo (that one is an orphan, DEMO-15).
    const seed = await seedNgo();
    const seedAnimal = await animal(seed.id);
    const seedPrefix = await photo(seed.id, {
      animalId: seedAnimal.id,
      position: 0,
    });
    const oldOrphan = await photo(seed.id, {
      createdAt: new Date(Date.now() - 25 * HOUR_MS),
    });
    const freshOrphan = await photo(seed.id, {});

    const exitCode = await runCleanup(app);

    expect(exitCode).toBe(0);
    expect(await prisma.ngo.count({ where: { id: ngoId } })).toBe(0);
    expect(await prisma.animal.count({ where: { id: saved.id } })).toBe(0);
    expect(await prisma.animalImage.count({ where: { ngoId } })).toBe(0);
    expect(
      storage.keys().filter((key) => key.startsWith(`ngos/${ngoId}/`)),
    ).toEqual([]);
    expect(storage.keys()).not.toContain(`${savedPrefix}-160.webp`);

    expect(await prisma.ngo.count({ where: { id: seed.id } })).toBe(1);
    expect(storage.keys()).toEqual(
      [
        `${seedPrefix}-160.webp`,
        `${seedPrefix}-1200.webp`,
        `${freshOrphan}-160.webp`,
        `${freshOrphan}-1200.webp`,
      ].sort(),
    );
    expect(storage.keys()).not.toContain(`${oldOrphan}-160.webp`);
    expect(await prisma.animalImage.count({ where: { ngoId: seed.id } })).toBe(
      2,
    );

    // Second run: nothing expired (DEMO-18).
    expect(await runCleanup(app)).toBe(0);
    expect(await prisma.ngo.count({ where: { id: seed.id } })).toBe(1);
    expect(storage.keys()).toHaveLength(4);
  });

  it('apaga acessos de limite de taxa com mais de 1 h, sessões sem uso há 7 dias e resets vencidos', async () => {
    const owner = await seedNgo();
    const old = new Date(Date.now() - 2 * HOUR_MS);
    const idle = new Date(Date.now() - 8 * 24 * HOUR_MS);
    await prisma.rateLimitHit.createMany({
      data: [
        { bucket: 'e2e-cleanup', keyHash: 'a'.repeat(64), createdAt: old },
        { bucket: 'e2e-cleanup', keyHash: 'a'.repeat(64) },
      ],
    });
    await prisma.session.createMany({
      data: [
        { ngoId: owner.id, tokenHash: 's'.repeat(64), lastUsedAt: idle },
        { ngoId: owner.id, tokenHash: 't'.repeat(64) },
      ],
    });
    await prisma.passwordReset.createMany({
      data: [
        { ngoId: owner.id, tokenHash: 'r'.repeat(64), expiresAt: old },
        {
          ngoId: owner.id,
          tokenHash: 'u'.repeat(64),
          expiresAt: new Date(Date.now() + HOUR_MS),
        },
      ],
    });

    expect(await runCleanup(app)).toBe(0);

    expect(
      await prisma.rateLimitHit.count({ where: { bucket: 'e2e-cleanup' } }),
    ).toBe(1);
    expect(
      await prisma.session.findMany({ where: { ngoId: owner.id } }),
    ).toEqual([expect.objectContaining({ tokenHash: 't'.repeat(64) })]);
    expect(
      await prisma.passwordReset.findMany({ where: { ngoId: owner.id } }),
    ).toEqual([expect.objectContaining({ tokenHash: 'u'.repeat(64) })]);
    await prisma.rateLimitHit.deleteMany({ where: { bucket: 'e2e-cleanup' } });
  });
});
