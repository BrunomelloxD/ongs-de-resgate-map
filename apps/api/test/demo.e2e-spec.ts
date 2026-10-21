import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

// Distinct values prove they come from the env. Set before AppModule validates it.
vi.hoisted(() => {
  Object.assign(process.env, {
    DEMO_MODE: 'true',
    DEMO_RETENTION_DAYS: '3',
    DEMO_MAX_NGOS: '12',
    DEMO_SIGNUPS_PER_IP_PER_DAY: '4',
    DEMO_MAX_ANIMALS_PER_NGO: '6',
    DEMO_MAX_IMAGES_PER_ANIMAL: '2',
    DEMO_MAX_UPLOAD_MB: '7',
    DEMO_MAX_STORAGE_MB: '250',
  });
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { apiClient } = await import('./helpers/api-client.js');

// Requires the database: docker compose up -d database
describe('GET /api/v1/demo com a demo ligada (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('devolve a retenção e as 6 cotas atuais (DEMO-01, DEMO-02)', async () => {
    const res = await apiClient(app).get('/api/v1/demo').expect(200);

    expect(res.body).toEqual({
      enabled: true,
      retentionDays: 3,
      quotas: {
        maxNgos: 12,
        signupsPerIpPerDay: 4,
        maxAnimalsPerNgo: 6,
        maxImagesPerAnimal: 2,
        maxUploadMb: 7,
        maxStorageMb: 250,
      },
    });
  });
});
