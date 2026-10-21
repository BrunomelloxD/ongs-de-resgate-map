import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { runCleanup } from './cleanup.js';

// Usage: node dist/app/cleanup.cli.js (Railway cron, AD-006; locally: npm run cleanup)
const app = await NestFactory.createApplicationContext(AppModule, {
  bufferLogs: true,
});
app.useLogger(app.get(Logger));

try {
  process.exitCode = await runCleanup(app);
} finally {
  await app.close();
}
