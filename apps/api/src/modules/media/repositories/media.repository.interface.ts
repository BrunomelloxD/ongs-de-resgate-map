import type { AnimalImage, Prisma } from '@/generated/prisma/client.js';

export type Tx = Prisma.TransactionClient;

export interface NgoImage {
  imageKey: string | null;
  imageBytes: number;
}

export interface NewPendingImage {
  id: string;
  ngoId: string;
  keyPrefix: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Only the domain methods: images have no generic CRUD (ARCHITECTURE §5.4).
 * Every lookup by id also filters by the owner NGO (SEC-06).
 */
export abstract class IMediaRepository {
  abstract transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  abstract createPending(tx: Tx, data: NewPendingImage): Promise<AnimalImage>;
  /** Bytes of every animal photo plus every NGO image. */
  abstract sumBytes(): Promise<number>;
  abstract countByAnimal(ngoId: string, animalId: string): Promise<number>;
  abstract findByIdsOfNgo(
    tx: Tx,
    ngoId: string,
    ids: readonly string[],
  ): Promise<AnimalImage[]>;
  abstract findByAnimal(
    tx: Tx,
    ngoId: string,
    animalId: string,
  ): Promise<AnimalImage[]>;
  /** `ids[0]` becomes the cover (position 0). */
  abstract savePositions(
    tx: Tx,
    ngoId: string,
    animalId: string,
    ids: readonly string[],
  ): Promise<void>;
  abstract deleteByIds(
    tx: Tx,
    ngoId: string,
    ids: readonly string[],
  ): Promise<void>;
  abstract findPendingOlderThan(before: Date): Promise<AnimalImage[]>;
  /** Only rows still pending, so a photo saved meanwhile stays. */
  abstract deletePendingByIds(ids: readonly string[]): Promise<void>;
  /** Rejects (P2025, so 404) when the NGO does not exist. */
  abstract findNgoImage(tx: Tx, ngoId: string): Promise<NgoImage>;
  abstract updateNgoImage(
    tx: Tx,
    ngoId: string,
    image: { imageKey: string; imageBytes: number },
  ): Promise<void>;
  /** Saved photo (not pending) of an ACTIVE NGO. */
  abstract findPublicByKeyPrefix(
    keyPrefix: string,
  ): Promise<AnimalImage | null>;
  /** `imageKey` is the current image of an ACTIVE NGO. */
  abstract hasPublicNgoImage(imageKey: string): Promise<boolean>;
}
