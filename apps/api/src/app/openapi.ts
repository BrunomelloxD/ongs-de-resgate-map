import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { Env } from '../common/config/env.schema.js';
import { configureRouting, createOpenApiDocument } from './app.setup.js';

// ConfigModule requires them, but the export never connects, mails or signs.
// Not secrets: they exist only while the export runs and are removed after (SEC-08).
const EXPORT_PLACEHOLDERS = {
  DATABASE_URL: 'postgresql://openapi:openapi@localhost/openapi',
  S3_ENDPOINT: 'http://localhost/openapi',
  S3_BUCKET: 'openapi',
  S3_ACCESS_KEY_ID: 'openapi',
  S3_SECRET_ACCESS_KEY: 'openapi',
  SMTP_URL: 'smtp://localhost',
  MAIL_FROM: 'openapi@localhost',
  WEB_URL: 'http://localhost',
  INTERNAL_API_TOKEN: 'openapi-placeholder-not-a-real-token',
  IP_HASH_SECRET: 'openapi-placeholder-not-a-real-secret',
  NOMINATIM_USER_AGENT: 'openapi',
} satisfies Partial<Record<keyof Env, string>>;

/** Preview mode skips provider instantiation, so no database is needed. */
export async function buildOpenApiDocument(): Promise<OpenAPIObject> {
  const filled = Object.entries(EXPORT_PLACEHOLDERS).filter(
    ([name]) => process.env[name] === undefined,
  );
  for (const [name, value] of filled) process.env[name] = value;

  try {
    // ConfigModule validates env when AppModule is imported.
    const { AppModule } = await import('./app.module.js');
    const app = await NestFactory.create(AppModule, {
      preview: true,
      logger: false,
    });

    configureRouting(app);
    const document = createOpenApiDocument(
      app,
      process.env['APP_NAME'] ?? 'api',
    );
    await app.close();

    return document;
  } finally {
    // DEMO-21: the api itself still fails to start without the real values.
    for (const [name] of filled) delete process.env[name];
  }
}

export async function exportOpenApi(outputPath: string): Promise<void> {
  const document = await buildOpenApiDocument();
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
}
