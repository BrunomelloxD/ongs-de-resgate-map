import { Logger, type INestApplicationContext } from '@nestjs/common';
import { CleanupService } from '@/modules/demo/services/cleanup.service.js';

const logger = new Logger('Cleanup');

/** Runs one cleanup and returns the process exit code: 0 on success, 1 on failure. */
export async function runCleanup(
  app: INestApplicationContext,
): Promise<number> {
  try {
    await app.get(CleanupService).run();
    return 0;
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : String(error));
    return 1;
  }
}
