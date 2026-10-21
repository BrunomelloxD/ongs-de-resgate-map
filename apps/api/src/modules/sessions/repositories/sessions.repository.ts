import { Injectable } from '@nestjs/common';
import type { Session } from '@/generated/prisma/client.js';
import { PrismaService } from '@/common/prisma/prisma.service.js';
import { ISessionsRepository } from './sessions.repository.interface.js';

@Injectable()
export class SessionsRepository extends ISessionsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  create(data: { ngoId: string; tokenHash: string }): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { tokenHash } });
  }

  // *Many: a session revoked by a parallel request is not an error here.
  async touch(id: string, lastUsedAt: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id },
      data: { lastUsedAt },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id } });
  }

  async deleteAllOf(ngoId: string, exceptId?: string): Promise<number> {
    const { count } = await this.prisma.session.deleteMany({
      where: { ngoId, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count;
  }

  async deleteExpired(before: Date): Promise<number> {
    const { count } = await this.prisma.session.deleteMany({
      where: { lastUsedAt: { lt: before } },
    });
    return count;
  }
}
