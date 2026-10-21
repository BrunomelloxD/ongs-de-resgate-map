import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { withAdvisoryLock } from '@/common/prisma/advisory-lock.js';
import type { Prisma } from '@/generated/prisma/client.js';

const MB = 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

type Tx = Pick<
  Prisma.TransactionClient,
  '$executeRaw' | 'ngo' | 'animal' | 'animalImage'
>;

/**
 * DEMO_* quotas (DEMO-07 to DEMO-12). The tx methods run inside the caller's
 * transaction, after the scope's advisory lock (AD-004). Seeds never count (DEMO-19).
 */
@Injectable()
export class DemoQuotaService {
  constructor(private readonly config: AppConfigService) {}

  async assertCanCreateNgo(tx: Tx, ipHash: string): Promise<void> {
    const demo = this.config.demo;
    if (!demo.enabled) {
      return;
    }
    await withAdvisoryLock(tx, 'quota:ngos');

    const activeNgos = await tx.ngo.count({
      where: { isSeed: false, status: 'ACTIVE' },
    });
    if (activeNgos >= demo.maxNgos) {
      throw new ConflictException(
        'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.',
      );
    }

    const signupsFromIp = await tx.ngo.count({
      where: {
        isSeed: false,
        signupIpHash: ipHash,
        createdAt: { gt: new Date(Date.now() - DAY_MS) },
      },
    });
    if (signupsFromIp >= demo.signupsPerIpPerDay) {
      throw new HttpException(
        'Limite de cadastros desta rede por hoje. Tente de novo amanhã.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async assertCanAddAnimal(tx: Tx, ngoId: string): Promise<void> {
    const demo = this.config.demo;
    if (!demo.enabled) {
      return;
    }
    await withAdvisoryLock(tx, `quota:animals:${ngoId}`);

    const animals = await tx.animal.count({ where: { ngoId } });
    if (animals >= demo.maxAnimalsPerNgo) {
      throw new ConflictException(
        `Sua ONG atingiu o limite de ${demo.maxAnimalsPerNgo} animais da demo. Exclua um animal para cadastrar outro.`,
      );
    }
  }

  /** `count` is the full list of photos the animal will have. */
  assertImageCount(count: number): void {
    const demo = this.config.demo;
    if (demo.enabled && count > demo.maxImagesPerAnimal) {
      throw new ConflictException(
        `Este animal já tem o máximo de ${demo.maxImagesPerAnimal} fotos da demo.`,
      );
    }
  }

  assertUploadSize(bytes: number): void {
    const demo = this.config.demo;
    if (demo.enabled && bytes > demo.maxUploadMb * MB) {
      throw new PayloadTooLargeException(
        `O arquivo passa de ${demo.maxUploadMb} MB.`,
      );
    }
  }

  /** Bytes in the bucket: animal photos plus NGO images. */
  async assertStorage(tx: Tx, bytes: number): Promise<void> {
    const demo = this.config.demo;
    if (!demo.enabled) {
      return;
    }
    await withAdvisoryLock(tx, 'quota:storage');

    const [images, logos] = await Promise.all([
      tx.animalImage.aggregate({
        _sum: { bytes: true },
        where: { ngo: { isSeed: false } },
      }),
      tx.ngo.aggregate({
        _sum: { imageBytes: true },
        where: { isSeed: false },
      }),
    ]);
    const used = (images._sum.bytes ?? 0) + (logos._sum.imageBytes ?? 0);
    if (used + bytes > demo.maxStorageMb * MB) {
      throw new ConflictException(
        'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
      );
    }
  }
}
