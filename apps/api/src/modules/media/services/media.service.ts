import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { withAdvisoryLock } from '@/common/prisma/advisory-lock.js';
import type { AnimalImage } from '@/generated/prisma/client.js';
import { DemoQuotaService } from '@/modules/demo/services/demo-quota.service.js';
import {
  type DeletedObjects,
  IObjectStorage,
  ObjectNotFound,
} from '../adapters/object-storage.js';
import {
  IImageProcessor,
  type ImageProfile,
  type ImageVariant,
  PROFILES,
  UnsupportedImage,
  VARIANT_CONTENT_TYPE,
} from '../adapters/sharp-image-processor.js';
import {
  IMediaRepository,
  type Tx,
} from '../repositories/media.repository.interface.js';

const HOUR_MS = 60 * 60 * 1000;
// Animal variants (PROFILES): 600 px for the cards, 1200 px for the gallery.
const CARD_SIZE = 600;
const LARGE_SIZE = 1200;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
// ngos/{ngoId}/images/{id}-{size}.webp or ngos/{ngoId}/logo/{id}-{size}.webp
const PUBLIC_KEY = new RegExp(
  `^(ngos/${UUID}/(images|logo)/${UUID})-(\\d+)\\.webp$`,
);

/** The part of the multer file the service needs. */
export interface UploadedImage {
  buffer: Buffer;
  size: number;
}

export interface UploadedAnimalImage {
  id: string;
  thumbUrl: string;
  width: number;
  height: number;
}

/** Object key of one variant: `{prefix}-{size}.webp`. */
export function variantKey(keyPrefix: string, size: number): string {
  return `${keyPrefix}-${size}.webp`;
}

/** URL relative to the web, served by its /img route (design: public images). */
export function imageUrl(keyPrefix: string, size: number): string {
  return `/img/${variantKey(keyPrefix, size)}`;
}

function keysOf(keyPrefix: string, profile: ImageProfile): string[] {
  return PROFILES[profile].sizes.map((size) => variantKey(keyPrefix, size));
}

function animalKeys(images: readonly AnimalImage[]): string[] {
  return images.flatMap(({ keyPrefix }) => keysOf(keyPrefix, 'animal'));
}

@Injectable()
export class MediaService {
  constructor(
    private readonly images: IMediaRepository,
    private readonly storage: IObjectStorage,
    private readonly processor: IImageProcessor,
    private readonly quota: DemoQuotaService,
    private readonly config: AppConfigService,
  ) {}

  async uploadAnimalImage(
    ngoId: string,
    file: UploadedImage | undefined,
  ): Promise<UploadedAnimalImage> {
    // Converted before the transaction: the lock is not held during the slow decode.
    const variants = await this.convert(file, 'animal');
    const id = randomUUID();
    const keyPrefix = `ngos/${ngoId}/images/${id}`;
    const bytes = totalBytes(variants);
    const { width, height } = variants.at(-1)!;

    await this.images.transaction(async (tx) => {
      await this.quota.assertStorage(tx, bytes);
      await this.images.createPending(tx, {
        id,
        ngoId,
        keyPrefix,
        bytes,
        width,
        height,
      });
      await this.putVariants(keyPrefix, variants);
    });

    return { id, thumbUrl: imageUrl(keyPrefix, 160), width, height };
  }

  /** Square 160 and 600 px variants; replaces the previous image (SIGN-09). */
  async uploadNgoImage(
    ngoId: string,
    file: UploadedImage | undefined,
  ): Promise<{ imageKey: string }> {
    const variants = await this.convert(file, 'ngo');
    const imageKey = `ngos/${ngoId}/logo/${randomUUID()}`;
    const imageBytes = totalBytes(variants);

    const previous = await this.images.transaction(async (tx) => {
      const current = await this.images.findNgoImage(tx, ngoId);
      // The old image leaves the bucket, so only the difference counts.
      await this.quota.assertStorage(tx, imageBytes - current.imageBytes);
      await this.images.updateNgoImage(tx, ngoId, { imageKey, imageBytes });
      await this.putVariants(imageKey, variants);
      return current.imageKey;
    });

    if (previous) {
      // After the commit, so a bucket failure never loses the new image.
      // A leftover stays under ngos/{id}/ and goes with the NGO prefix.
      await Promise.allSettled([
        this.storage.deleteKeys(keysOf(previous, 'ngo')),
      ]);
    }
    return { imageKey };
  }

  /**
   * Saves the full, ordered photo list of an animal (the first is the cover)
   * and removes the photos that left it, from the database and the bucket.
   */
  async attachToAnimal(
    tx: Tx,
    ngoId: string,
    animalId: string,
    imageIds: readonly string[],
  ): Promise<void> {
    const ids = [...new Set(imageIds)];
    if (ids.length === 0) {
      throw new BadRequestException('Adicione pelo menos 1 foto.');
    }
    this.quota.assertImageCount(ids.length);
    await withAdvisoryLock(tx, `quota:images:${animalId}`);

    const found = await this.images.findByIdsOfNgo(tx, ngoId, ids);
    // Only pending photos or photos already on this animal.
    const usable = found.filter(
      (image) => image.animalId === null || image.animalId === animalId,
    );
    if (usable.length !== ids.length) {
      throw new NotFoundException('Foto não encontrada.');
    }

    const current = await this.images.findByAnimal(tx, ngoId, animalId);
    const removed = current.filter((image) => !ids.includes(image.id));
    if (removed.length > 0) {
      await this.images.deleteByIds(
        tx,
        ngoId,
        removed.map((image) => image.id),
      );
    }
    await this.images.savePositions(tx, ngoId, animalId, ids);
    if (removed.length > 0) {
      // Last step: a bucket failure rolls the rows back.
      await this.bucket(() => this.storage.deleteKeys(animalKeys(removed)));
    }
  }

  /** Every photo of the animal, before the animal itself is deleted. */
  async deleteImages(tx: Tx, ngoId: string, animalId: string): Promise<void> {
    const images = await this.images.findByAnimal(tx, ngoId, animalId);
    await this.images.deleteByIds(
      tx,
      ngoId,
      images.map((image) => image.id),
    );
    await this.bucket(() => this.storage.deleteKeys(animalKeys(images)));
  }

  deleteNgoPrefix(ngoId: string): Promise<DeletedObjects> {
    return this.bucket(() => this.storage.deletePrefix(`ngos/${ngoId}/`));
  }

  /** Animal photos only (saved and pending); the NGO image stays (AD-008 reset). */
  deleteNgoImages(ngoId: string): Promise<DeletedObjects> {
    return this.bucket(() =>
      this.storage.deletePrefix(`ngos/${ngoId}/images/`),
    );
  }

  /** DEMO-15: uploads never saved with an animal. `count` is in objects. */
  async deletePendingOlderThan(hours: number): Promise<DeletedObjects> {
    const before = new Date(Date.now() - hours * HOUR_MS);
    const pending = await this.images.findPendingOlderThan(before);
    const keys = animalKeys(pending);

    // Objects first: if the bucket fails, the rows stay for the next run.
    await this.bucket(() => this.storage.deleteKeys(keys));
    await this.images.deletePendingByIds(pending.map((image) => image.id));

    return {
      count: keys.length,
      bytes: pending.reduce((sum, image) => sum + image.bytes, 0),
    };
  }

  /** Only saved photos and current images of ACTIVE NGOs (SEC-06). */
  async getPublicImage(key: string): Promise<Readable> {
    const [, keyPrefix, kind, size] = PUBLIC_KEY.exec(key) ?? [];
    const profile: ImageProfile = kind === 'images' ? 'animal' : 'ngo';
    const sizes: readonly number[] = PROFILES[profile].sizes;
    if (!keyPrefix || !sizes.includes(Number(size))) {
      throw new NotFoundException();
    }

    const visible = await (profile === 'animal'
      ? this.images
          .findPublicByKeyPrefix(keyPrefix)
          .then((image) => image !== null)
      : this.images.hasPublicNgoImage(keyPrefix));
    if (!visible) {
      throw new NotFoundException();
    }

    const stream =
      (await this.findStream(key)) ??
      // Photos saved before the 600 px variant existed (T174): the 1200 px one stands in.
      (profile === 'animal' && Number(size) === CARD_SIZE
        ? await this.findStream(variantKey(keyPrefix, LARGE_SIZE))
        : null);
    if (!stream) {
      throw new NotFoundException();
    }
    return stream;
  }

  private async findStream(key: string): Promise<Readable | null> {
    try {
      return await this.storage.getStream(key);
    } catch (error) {
      if (error instanceof ObjectNotFound) {
        return null;
      }
      throw error;
    }
  }

  private async bucket<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível excluir agora. Tente de novo.',
      );
    }
  }

  private async convert(
    file: UploadedImage | undefined,
    profile: ImageProfile,
  ): Promise<ImageVariant[]> {
    if (!file) {
      throw this.invalidImage(profile);
    }
    this.quota.assertUploadSize(file.size);
    try {
      return await this.processor.process(file.buffer, profile);
    } catch (error) {
      if (error instanceof UnsupportedImage) {
        throw this.invalidImage(profile);
      }
      throw error;
    }
  }

  /** One at a time, so a failure knows exactly what to remove. */
  private async putVariants(
    keyPrefix: string,
    variants: readonly ImageVariant[],
  ): Promise<void> {
    const written: string[] = [];
    try {
      for (const { size, body } of variants) {
        const key = variantKey(keyPrefix, size);
        await this.storage.put(key, body, VARIANT_CONTENT_TYPE);
        written.push(key);
      }
    } catch (error) {
      // Best effort: the original error is what the caller needs to see.
      await Promise.allSettled([this.storage.deleteKeys(written)]);
      throw error;
    }
  }

  private invalidImage(profile: ImageProfile): BadRequestException {
    const { maxUploadMb } = this.config.demo;
    // AFORM-08 for animal photos, SIGN-10 for the NGO image.
    return new BadRequestException(
      profile === 'animal'
        ? `Envie JPG, PNG, WebP ou HEIC de até ${maxUploadMb} MB.`
        : `Envie JPG, PNG ou WebP de até ${maxUploadMb} MB.`,
    );
  }
}

function totalBytes(variants: readonly ImageVariant[]): number {
  return variants.reduce((sum, { body }) => sum + body.length, 0);
}
