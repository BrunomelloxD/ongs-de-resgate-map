import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

// Must run before AppModule loads, because the env is validated on import.
vi.hoisted(() => {
  process.env['THROTTLE_LIMIT'] = '2';
  process.env['THROTTLE_TTL'] = '60000';
});

const { AppModule } = await import('@/app/app.module.js');
const { setupApp } = await import('@/app/app.setup.js');
const { apiClient } = await import('./helpers/api-client.js');

// Requires the database: docker compose up -d database
describe('Limite de taxa por IP do visitante (e2e)', () => {
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

  const hit = (ip: string) =>
    apiClient(app).get('/api/v1/demo').set('X-Client-IP', ip);

  it('dois IPs diferentes em X-Client-IP não dividem o mesmo limite', async () => {
    await hit('203.0.113.1').expect(200);
    await hit('203.0.113.1').expect(200);
    await hit('203.0.113.1').expect(429);

    await hit('203.0.113.2').expect(200);
    await hit('203.0.113.2').expect(200);
    await hit('203.0.113.2').expect(429);
  });

  it('o mesmo IP em X-Client-IP divide o limite entre requisições', async () => {
    await hit('203.0.113.3').expect(200);
    await hit('203.0.113.3').expect(200);

    await hit('203.0.113.3').expect(429);
  });
});
