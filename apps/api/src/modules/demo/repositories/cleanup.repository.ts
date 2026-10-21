import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service.js';
import {
  type ExpiredNgo,
  ICleanupRepository,
} from './cleanup.repository.interface.js';

@Injectable()
export class CleanupRepository extends ICleanupRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findExpiredNgos(now: Date): Promise<ExpiredNgo[]> {
    const ngos = await this.prisma.ngo.findMany({
      where: { isSeed: false, expiresAt: { lt: now } },
      select: { id: true, _count: { select: { animals: true } } },
    });
    return ngos.map(({ id, _count }) => ({ id, animals: _count.animals }));
  }

  // *Many: an NGO removed by a parallel request is not an error here.
  async deleteNgo(id: string): Promise<void> {
    await this.prisma.ngo.deleteMany({ where: { id, isSeed: false } });
  }

  async deleteRateLimitHitsBefore(before: Date): Promise<number> {
    const { count } = await this.prisma.rateLimitHit.deleteMany({
      where: { createdAt: { lt: before } },
    });
    return count;
  }

  async deleteExpiredPasswordResets(now: Date): Promise<number> {
    const { count } = await this.prisma.passwordReset.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return count;
  }
}
