import type {
  Ngo,
  Prisma,
  Sex,
  Size,
  Species,
} from '@/generated/prisma/client.js';
import type { DayHours } from '../services/open-status.js';

export type Tx = Prisma.TransactionClient;

export type NgoWithHours = Prisma.NgoGetPayload<{
  include: { openingHours: true };
}>;

/** Public page: hours plus the number of animals (NGO-08 needs "has any"). */
export type NgoPublicRecord = Prisma.NgoGetPayload<{
  include: { openingHours: true; _count: { select: { animals: true } } };
}>;

/** Animal of the NGO grid with its cover only (ANI-02). */
export type NgoAnimalRecord = Prisma.AnimalGetPayload<{
  include: { images: true };
}>;

/** Visible map area, in degrees. */
export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** MAP-18: at most 200 NGOs per search. */
export const SEARCH_LIMIT = 200;

export interface SearchResult {
  items: NgoWithHours[];
  /** More than SEARCH_LIMIT NGOs in the bbox. */
  truncated: boolean;
}

export interface AnimalFilters {
  species?: Species;
  sex?: Sex;
  size?: Size;
  /** true = only available animals (NGO-05); false = all (NGO-07). */
  available: boolean;
}

export interface PageParams {
  skip: number;
  take: number;
}

export type NewNgo = Omit<Prisma.NgoCreateInput, 'openingHours'>;

/**
 * Only the domain methods: no generic CRUD (ARCHITECTURE §5.4).
 * Every public lookup filters status = ACTIVE (MAP-02, NGO-11).
 */
export abstract class INgosRepository {
  abstract transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Closest to the bbox center first; `species` is a union (MAPF-03). */
  abstract searchByBbox(
    bbox: Bbox,
    species: readonly Species[],
  ): Promise<SearchResult>;
  abstract findActiveBySlug(slug: string): Promise<NgoPublicRecord | null>;
  abstract findAnimals(
    ngoId: string,
    filters: AnimalFilters,
    page: PageParams,
  ): Promise<{ items: NgoAnimalRecord[]; total: number }>;
  abstract create(
    tx: Tx,
    data: NewNgo,
    hours: readonly DayHours[],
  ): Promise<NgoWithHours>;
  /** Slugs equal to `base` or starting with it (SIGN-29 suffixes). */
  abstract findSlugsStartingWith(tx: Tx, base: string): Promise<string[]>;
  abstract findBySignupRequestId(id: string): Promise<NgoWithHours | null>;
  abstract findByEmail(email: string): Promise<Ngo | null>;
  /** SIGN-05 and SIGN-12 checks, before the final submission. */
  abstract existsByCnpj(cnpj: string): Promise<boolean>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract findById(id: string): Promise<NgoWithHours | null>;
  /** `hours`, when given, replaces the 7 days. */
  abstract update(
    id: string,
    data: Prisma.NgoUpdateInput,
    hours?: readonly DayHours[],
  ): Promise<NgoWithHours>;
  /** Cascades to hours, animals, images, sessions and resets. */
  abstract delete(id: string): Promise<void>;
}
