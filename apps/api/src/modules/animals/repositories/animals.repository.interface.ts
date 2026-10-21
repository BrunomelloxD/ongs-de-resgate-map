import type {
  AgeUnit,
  Animal,
  Prisma,
  Sex,
  Size,
  Species,
} from '@/generated/prisma/client.js';

export type Tx = Prisma.TransactionClient;

/** Animal with its saved photos, cover (position 0) first. */
export type AnimalWithImages = Prisma.AnimalGetPayload<{
  include: { images: true };
}>;

/** Public page: photos plus the owner NGO (the mapper keeps only a summary). */
export type PublicAnimalRecord = Prisma.AnimalGetPayload<{
  include: { images: true; ngo: true };
}>;

/** DASH-05 filters of the dashboard. */
export const ANIMAL_FILTERS = [
  'all',
  'dogs',
  'cats',
  'available',
  'unavailable',
] as const;
export type AnimalFilter = (typeof ANIMAL_FILTERS)[number];

export interface AnimalListQuery {
  /** DASH-04: part of the name, ignoring accents and case. */
  search?: string;
  filter: AnimalFilter;
}

/** Fields the NGO fills in the form (AFORM-01 to AFORM-06). */
export interface AnimalData {
  name: string;
  species: Species;
  breed?: string | null;
  sex: Sex;
  size: Size;
  ageValue: number;
  ageUnit: AgeUnit;
  description?: string | null;
}

export interface NewAnimal extends AnimalData {
  ngoId: string;
  available: boolean;
}

export type AnimalChanges = Partial<AnimalData> & {
  available?: boolean;
  availableChangedAt?: Date;
};

/**
 * Only the domain methods: no generic CRUD (ARCHITECTURE §5.4).
 * Every lookup of the NGO area filters by ngoId (SEC-06).
 */
export abstract class IAnimalsRepository {
  abstract transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Only animals of ACTIVE NGOs (ANI-06). */
  abstract findPublicById(id: string): Promise<PublicAnimalRecord | null>;
  abstract findAllOfNgo(
    ngoId: string,
    query: AnimalListQuery,
  ): Promise<AnimalWithImages[]>;
  abstract findOwn(
    tx: Tx,
    ngoId: string,
    id: string,
  ): Promise<AnimalWithImages | null>;
  abstract create(tx: Tx, data: NewAnimal): Promise<Animal>;
  abstract update(
    tx: Tx,
    ngoId: string,
    id: string,
    data: AnimalChanges,
  ): Promise<Animal>;
  abstract delete(tx: Tx, ngoId: string, id: string): Promise<void>;
}
