import type { Prisma } from '@/generated/prisma/client.js';

/**
 * Serializes callers of the same key until the transaction ends (AD-004).
 * $executeRaw, not $queryRaw: the function returns void, which Prisma cannot deserialize.
 */
export async function withAdvisoryLock(
  tx: Pick<Prisma.TransactionClient, '$executeRaw'>,
  key: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
