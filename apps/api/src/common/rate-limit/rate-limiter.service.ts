import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { PrismaService } from '@/common/prisma/prisma.service.js';

export interface RateLimitResult {
  allowed: boolean;
  /** 0 when allowed; otherwise, time until the window frees a slot. */
  retryAfterMs: number;
}

/** Sliding-window limiter over rate_limit_hits, shared by every api instance. */
@Injectable()
export class RateLimiter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** Checks without recording. */
  peek(
    bucket: string,
    key: string,
    windowMs: number,
    max: number,
  ): Promise<RateLimitResult> {
    return this.check(bucket, this.hashKey(key), windowMs, max, new Date());
  }

  /** Records the hit only when allowed, so a blocked caller cannot extend the window. */
  async hit(
    bucket: string,
    key: string,
    windowMs: number,
    max: number,
  ): Promise<RateLimitResult> {
    const keyHash = this.hashKey(key);
    const now = new Date();
    const result = await this.check(bucket, keyHash, windowMs, max, now);

    if (result.allowed) {
      await this.prisma.rateLimitHit.create({
        data: { bucket, keyHash, createdAt: now },
      });
    }
    return result;
  }

  private async check(
    bucket: string,
    keyHash: string,
    windowMs: number,
    max: number,
    now: Date,
  ): Promise<RateLimitResult> {
    const hits = await this.prisma.rateLimitHit.findMany({
      where: {
        bucket,
        keyHash,
        createdAt: { gt: new Date(now.getTime() - windowMs) },
      },
      orderBy: { createdAt: 'desc' },
      take: max,
      select: { createdAt: true },
    });

    if (hits.length < max) {
      return { allowed: true, retryAfterMs: 0 };
    }
    // A slot frees when the max-th most recent hit leaves the window.
    const freesAt = hits[max - 1].createdAt.getTime() + windowMs;
    return { allowed: false, retryAfterMs: freesAt - now.getTime() };
  }

  // IPs and e-mails never reach the table in clear text.
  private hashKey(key: string): string {
    return createHmac('sha256', this.config.ipHashSecret)
      .update(key)
      .digest('hex');
  }
}
