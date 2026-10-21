import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppConfigService } from '@/common/config/app-config.service.js';

/** Requests as the web sends them: always with the internal token (AD-002). */
export function apiClient(app: INestApplication) {
  return request
    .agent(app.getHttpServer())
    .set('X-Internal-Token', app.get(AppConfigService).internalApiToken);
}
