import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '@/app/app.module.js';
import { setupApp } from '@/app/app.setup.js';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { apiClient } from './helpers/api-client.js';

// Requires the database: docker compose up -d database
describe('API (e2e)', () => {
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

  it('GET /health responde fora do prefixo /api', async () => {
    const res = await apiClient(app).get('/health').expect(200);

    expect(res.body.status).toBe('ok');
  });

  describe('token interno (AUTH-07, SEC-08)', () => {
    it('GET /health sem token responde 200', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body.status).toBe('ok');
    });

    it('rota /api/v1/* sem token responde 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/demo')
        .expect(401);

      expect(res.body).toEqual({ statusCode: 401, message: 'Unauthorized' });
    });

    it('rota /api/v1/* com token errado responde 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/demo')
        .set('X-Internal-Token', 'token-errado')
        .expect(401);
    });

    it('rota /api/v1/* com o token certo responde 200', async () => {
      const token = app.get(AppConfigService).internalApiToken;

      const res = await request(app.getHttpServer())
        .get('/api/v1/demo')
        .set('X-Internal-Token', token)
        .expect(200);

      expect(typeof res.body.enabled).toBe('boolean');
    });

    it('o helper de e2e envia o token', async () => {
      await apiClient(app).get('/api/v1/demo').expect(200);
    });
  });
});
