import { Injectable, Logger } from '@nestjs/common';
import { MediaService } from '@/modules/media/services/media.service.js';
import { ISessionsRepository } from '@/modules/sessions/repositories/sessions.repository.interface.js';
import { SESSION_IDLE_TTL_MS } from '@/modules/sessions/services/sessions.service.js';
import { ICleanupRepository } from '../repositories/cleanup.repository.interface.js';

const HOUR_MS = 60 * 60 * 1000;
/** DEMO-15: uploads not saved with an animal for this long are orphans. */
const PENDING_MAX_AGE_HOURS = 24;
/** The longest rate limit window in use is 1 h (password reset). */
const RATE_LIMIT_MAX_WINDOW_MS = HOUR_MS;

/** DEMO-16: what one run removed. `objects` and `bytes` come from the bucket. */
export interface CleanupReport {
  ngos: number;
  animals: number;
  objects: number;
  bytes: number;
}

/**
 * Deletes everything that has expired (DEMO-14 to DEMO-18). Run daily by the
 * Railway cron (AD-006); a failure is recovered by the next run, because each
 * run removes "everything expired", not "what expired since the last run".
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly cleanup: ICleanupRepository,
    private readonly media: MediaService,
    private readonly sessions: ISessionsRepository,
  ) {}

  async run(): Promise<CleanupReport> {
    const now = new Date();
    const report: CleanupReport = { ngos: 0, animals: 0, objects: 0, bytes: 0 };

    for (const ngo of await this.cleanup.findExpiredNgos(now)) {
      try {
        // Bucket first: if it fails the row stays for the next run (DEMO-17).
        const { count, bytes } = await this.media.deleteNgoPrefix(ngo.id);
        await this.cleanup.deleteNgo(ngo.id);
        report.ngos += 1;
        report.animals += ngo.animals;
        report.objects += count;
        report.bytes += bytes;
      } catch (error) {
        this.logger.error(
          `NGO ${ngo.id} kept for the next run: ${message(error)}`,
        );
      }
    }

    try {
      const { count, bytes } = await this.media.deletePendingOlderThan(
        PENDING_MAX_AGE_HOURS,
      );
      report.objects += count;
      report.bytes += bytes;
    } catch (error) {
      this.logger.error(
        `Pending images kept for the next run: ${message(error)}`,
      );
    }

    await this.cleanup.deleteRateLimitHitsBefore(
      new Date(now.getTime() - RATE_LIMIT_MAX_WINDOW_MS),
    );
    await this.sessions.deleteExpired(
      new Date(now.getTime() - SESSION_IDLE_TTL_MS),
    );
    await this.cleanup.deleteExpiredPasswordResets(now);

    this.logger.log({ event: 'cleanup', ...report });
    return report;
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
