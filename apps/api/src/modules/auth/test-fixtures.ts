import type { AppConfigService } from '@/common/config/app-config.service.js';
import type { PrismaService } from '@/common/prisma/prisma.service.js';
import { RateLimiter } from '@/common/rate-limit/rate-limiter.service.js';
import type { Ngo } from '@/generated/prisma/client.js';
import { makeNgo } from '@/modules/ngos/test-fixtures.js';

interface Hit {
  bucket: string;
  keyHash: string;
  createdAt: Date;
}

interface FindManyArgs {
  where: { bucket: string; keyHash: string; createdAt: { gt: Date } };
  take: number;
}

/** The real RateLimiter over an in-memory rate_limit_hits table. */
export function makeRateLimiter() {
  const rows: Hit[] = [];
  const rateLimitHit = {
    findMany: ({ where, take }: FindManyArgs) =>
      Promise.resolve(
        rows
          .filter(
            (row) =>
              row.bucket === where.bucket &&
              row.keyHash === where.keyHash &&
              row.createdAt > where.createdAt.gt,
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, take),
      ),
    create: ({ data }: { data: Hit }) => {
      rows.push(data);
      return Promise.resolve(data);
    },
  };
  const limiter = new RateLimiter(
    { rateLimitHit } as unknown as PrismaService,
    { ipHashSecret: 's'.repeat(40) } as AppConfigService,
  );
  return { rows, limiter };
}

/** NGO without the hours, as findByEmailForAuth returns it. */
export function makeAuthNgo(overrides: Partial<Ngo> = {}): Ngo {
  const { openingHours: _hours, ...ngo } = makeNgo();
  return { ...ngo, ...overrides };
}
