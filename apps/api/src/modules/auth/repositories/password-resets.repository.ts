import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service.js';
import type { PasswordReset } from '@/generated/prisma/client.js';
import {
  IPasswordResetsRepository,
  type NewPasswordReset,
} from './password-resets.repository.interface.js';

@Injectable()
export class PasswordResetsRepository extends IPasswordResetsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: NewPasswordReset): Promise<void> {
    await this.prisma.passwordReset.create({ data });
  }

  findByTokenHash(tokenHash: string): Promise<PasswordReset | null> {
    return this.prisma.passwordReset.findUnique({ where: { tokenHash } });
  }

  // Conditional update: two requests with the same link cannot both win.
  async markUsed(id: string, usedAt: Date): Promise<boolean> {
    const { count } = await this.prisma.passwordReset.updateMany({
      where: { id, usedAt: null },
      data: { usedAt },
    });
    return count === 1;
  }
}
