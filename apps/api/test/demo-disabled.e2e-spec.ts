import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

// Own file: the env is validated once, when AppModule is imported.
vi.hoisted(() => {
  process.env['DEMO_MODE'] = 'false';
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { apiClient } = await import('./helpers/api-client.js');

// Requires the database: docker compose up -d database
describe('GET /api/v1/demo com a demo desligada (e2e)', () => {
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

  it('devolve enabled: false e os limites sem demo, 8 fotos e 10 MB (DEMO-20)', async () => {
    const res = await apiClient(app).get('/api/v1/demo').expect(200);

    expect(res.body.enabled).toBe(false);
    expect(res.body.quotas).toMatchObject({
      maxImagesPerAnimal: 8,
      maxUploadMb: 10,
    });
  });
});
