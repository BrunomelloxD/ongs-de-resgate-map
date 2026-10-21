import { createHmac } from 'node:crypto';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import type { PrismaService } from '@/common/prisma/prisma.service.js';
import { RateLimiter } from '../rate-limiter.service.js';

const SECRET = 's'.repeat(40);
const MINUTE = 60_000;
const WINDOW = 15 * MINUTE;
const START = new Date('2026-10-20T12:00:00.000Z');

interface StoredHit {
  bucket: string;
  keyHash: string;
  createdAt: Date;
}

interface FindManyArgs {
  where: { bucket: string; keyHash: string; createdAt: { gt: Date } };
  orderBy: { createdAt: 'desc' };
  take: number;
}

/** In-memory stand-in for the rate_limit_hits table. */
function fakePrisma() {
  const rows: StoredHit[] = [];
  const rateLimitHit = {
    findMany: vi.fn(({ where, orderBy, take }: FindManyArgs) => {
      expect(orderBy).toEqual({ createdAt: 'desc' });
      return Promise.resolve(
        rows
          .filter(
            (row) =>
              row.bucket === where.bucket &&
              row.keyHash === where.keyHash &&
              row.createdAt > where.createdAt.gt,
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, take),
      );
    }),
    create: vi.fn(({ data }: { data: StoredHit }) => {
      rows.push({ ...data });
      return Promise.resolve(data);
    }),
  };
  return { rows, prisma: { rateLimitHit } as unknown as PrismaService };
}

function limiterWith(secret = SECRET) {
  const { rows, prisma } = fakePrisma();
  const limiter = new RateLimiter(prisma, {
    ipHashSecret: secret,
  } as AppConfigService);
  return { rows, limiter };
}

function advance(ms: number) {
  vi.setSystemTime(new Date(Date.now() + ms));
}

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('hit', () => {
    it('permite enquanto está abaixo do limite e registra cada pedido', async () => {
      const { rows, limiter } = limiterWith();

      for (let i = 0; i < 3; i++) {
        expect(
          await limiter.hit('password-reset', '203.0.113.7', 60 * MINUTE, 3),
        ).toEqual({ allowed: true, retryAfterMs: 0 });
        advance(MINUTE);
      }
      expect(rows).toHaveLength(3);
    });

    it('bloqueia no limite, com retryAfterMs até o fim da janela, sem registrar o pedido bloqueado', async () => {
      const { rows, limiter } = limiterWith();

      for (let i = 0; i < 5; i++) {
        await limiter.hit(
          'login-fail',
          '203.0.113.7|ong@exemplo.org',
          WINDOW,
          5,
        );
        advance(MINUTE);
      }
      // 5 minutes after the first hit: it leaves the window in 10 minutes.
      expect(
        await limiter.hit(
          'login-fail',
          '203.0.113.7|ong@exemplo.org',
          WINDOW,
          5,
        ),
      ).toEqual({ allowed: false, retryAfterMs: 10 * MINUTE });
      expect(rows).toHaveLength(5);
    });

    it('volta a permitir quando o registro mais antigo sai da janela', async () => {
      const { limiter } = limiterWith();

      for (let i = 0; i < 5; i++) {
        await limiter.hit('login-fail', 'chave', WINDOW, 5);
        advance(MINUTE);
      }
      advance(10 * MINUTE - 1);
      expect(await limiter.hit('login-fail', 'chave', WINDOW, 5)).toEqual({
        allowed: false,
        retryAfterMs: 1,
      });

      advance(1);
      expect(await limiter.hit('login-fail', 'chave', WINDOW, 5)).toEqual({
        allowed: true,
        retryAfterMs: 0,
      });
    });

    it('não conta registros fora da janela', async () => {
      const { rows, limiter } = limiterWith();

      for (let i = 0; i < 3; i++) {
        await limiter.hit('password-reset', 'ong@exemplo.org', 60 * MINUTE, 3);
      }
      advance(60 * MINUTE);

      expect(
        await limiter.hit('password-reset', 'ong@exemplo.org', 60 * MINUTE, 3),
      ).toEqual({ allowed: true, retryAfterMs: 0 });
      expect(rows).toHaveLength(4);
    });

    it('separa as contagens por bucket e por chave', async () => {
      const { limiter } = limiterWith();

      await limiter.hit('password-reset', 'a@exemplo.org', 60 * MINUTE, 1);

      expect(
        await limiter.hit('password-reset', 'b@exemplo.org', 60 * MINUTE, 1),
      ).toEqual({ allowed: true, retryAfterMs: 0 });
      expect(
        await limiter.hit('login-fail', 'a@exemplo.org', 60 * MINUTE, 1),
      ).toEqual({ allowed: true, retryAfterMs: 0 });
      expect(
        await limiter.hit('password-reset', 'a@exemplo.org', 60 * MINUTE, 1),
      ).toEqual({ allowed: false, retryAfterMs: 60 * MINUTE });
    });
  });

  describe('peek', () => {
    it('informa o estado sem registrar nada', async () => {
      const { rows, limiter } = limiterWith();

      expect(await limiter.peek('login-fail', 'chave', WINDOW, 5)).toEqual({
        allowed: true,
        retryAfterMs: 0,
      });
      expect(rows).toHaveLength(0);
    });

    it('bloqueia quando o limite já foi atingido', async () => {
      const { rows, limiter } = limiterWith();

      for (let i = 0; i < 5; i++) {
        await limiter.hit('login-fail', 'chave', WINDOW, 5);
      }
      advance(2 * MINUTE);

      expect(await limiter.peek('login-fail', 'chave', WINDOW, 5)).toEqual({
        allowed: false,
        retryAfterMs: 13 * MINUTE,
      });
      expect(rows).toHaveLength(5);
    });
  });

  describe('chave gravada', () => {
    it('é o HMAC-SHA256 da chave com IP_HASH_SECRET, nunca o IP ou o e-mail em claro', async () => {
      const { rows, limiter } = limiterWith();
      const key = '203.0.113.7|ong@exemplo.org';

      await limiter.hit('login-fail', key, WINDOW, 5);

      const [row] = rows;
      expect(row).toEqual({
        bucket: 'login-fail',
        keyHash: createHmac('sha256', SECRET).update(key).digest('hex'),
        createdAt: START,
      });
      expect(row?.keyHash).toMatch(/^[0-9a-f]{64}$/);
      expect(row?.keyHash).not.toContain('203.0.113.7');
      expect(row?.keyHash).not.toContain('ong@exemplo.org');
    });

    it('depende do segredo: outro segredo gera outra chave', async () => {
      const first = limiterWith();
      const second = limiterWith('t'.repeat(40));

      await first.limiter.hit('login-fail', 'chave', WINDOW, 5);
      await second.limiter.hit('login-fail', 'chave', WINDOW, 5);

      expect(first.rows[0]?.keyHash).not.toBe(second.rows[0]?.keyHash);
    });
  });
});
