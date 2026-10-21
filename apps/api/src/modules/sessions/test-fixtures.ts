import type { Session } from '@/generated/prisma/client.js';

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: '7c1c2f4e-3b0a-4f7e-9d1a-0b6f5e2a9c11',
    ngoId: 'b3f1d6a2-8c4e-4a7b-9f0d-2e5c6a1b7d33',
    tokenHash: 'a'.repeat(64),
    lastUsedAt: new Date('2026-10-20T12:00:00.000Z'),
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  };
}
