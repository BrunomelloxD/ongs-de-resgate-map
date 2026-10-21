import { Injectable } from '@nestjs/common';
import type { AnimalImage } from '@/generated/prisma/client.js';
import { PrismaService } from '@/common/prisma/prisma.service.js';
import {
  IMediaRepository,
  type NewPendingImage,
  type NgoImage,
  type Tx,
} from './media.repository.interface.js';

@Injectable()
export class MediaRepository extends IMediaRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  createPending(tx: Tx, data: NewPendingImage): Promise<AnimalImage> {
    return tx.animalImage.create({ data });
  }

  async sumBytes(): Promise<number> {
    const [images, logos] = await Promise.all([
      this.prisma.animalImage.aggregate({ _sum: { bytes: true } }),
      this.prisma.ngo.aggregate({ _sum: { imageBytes: true } }),
    ]);
    return (images._sum.bytes ?? 0) + (logos._sum.imageBytes ?? 0);
  }

  countByAnimal(ngoId: string, animalId: string): Promise<number> {
    return this.prisma.animalImage.count({ where: { ngoId, animalId } });
  }

  findByIdsOfNgo(
    tx: Tx,
    ngoId: string,
    ids: readonly string[],
  ): Promise<AnimalImage[]> {
    return tx.animalImage.findMany({ where: { id: { in: [...ids] }, ngoId } });
  }

  findByAnimal(
    tx: Tx,
    ngoId: string,
    animalId: string,
  ): Promise<AnimalImage[]> {
    return tx.animalImage.findMany({ where: { ngoId, animalId } });
  }

  async savePositions(
    tx: Tx,
    ngoId: string,
    animalId: string,
    ids: readonly string[],
  ): Promise<void> {
    // Negative first, so no write clashes with @@unique([animalId, position]).
    const phases = [(i: number) => -(i + 1), (i: number) => i];
    for (const position of phases) {
      for (const [i, id] of ids.entries()) {
        await tx.animalImage.update({
          where: { id, ngoId },
          data: { animalId, position: position(i) },
        });
      }
    }
  }

  async deleteByIds(
    tx: Tx,
    ngoId: string,
    ids: readonly string[],
  ): Promise<void> {
    await tx.animalImage.deleteMany({ where: { id: { in: [...ids] }, ngoId } });
  }

  findPendingOlderThan(before: Date): Promise<AnimalImage[]> {
    return this.prisma.animalImage.findMany({
      where: { animalId: null, createdAt: { lt: before } },
    });
  }

  async deletePendingByIds(ids: readonly string[]): Promise<void> {
    await this.prisma.animalImage.deleteMany({
      where: { id: { in: [...ids] }, animalId: null },
    });
  }

  findNgoImage(tx: Tx, ngoId: string): Promise<NgoImage> {
    return tx.ngo.findUniqueOrThrow({
      where: { id: ngoId },
      select: { imageKey: true, imageBytes: true },
    });
  }

  async updateNgoImage(
    tx: Tx,
    ngoId: string,
    image: { imageKey: string; imageBytes: number },
  ): Promise<void> {
    await tx.ngo.update({ where: { id: ngoId }, data: image });
  }

  findPublicByKeyPrefix(keyPrefix: string): Promise<AnimalImage | null> {
    return this.prisma.animalImage.findFirst({
      where: {
        keyPrefix,
        animalId: { not: null },
        ngo: { status: 'ACTIVE' },
      },
    });
  }

  async hasPublicNgoImage(imageKey: string): Promise<boolean> {
    const count = await this.prisma.ngo.count({
      where: { imageKey, status: 'ACTIVE' },
    });
    return count > 0;
  }
}
