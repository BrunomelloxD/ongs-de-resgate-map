import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service.js';
import { type Animal, Prisma } from '@/generated/prisma/client.js';
import {
  type AnimalChanges,
  type AnimalFilter,
  type AnimalListQuery,
  type AnimalWithImages,
  IAnimalsRepository,
  type NewAnimal,
  type PublicAnimalRecord,
  type Tx,
} from './animals.repository.interface.js';

const WITH_IMAGES = {
  images: { orderBy: { position: 'asc' } },
} satisfies Prisma.AnimalInclude;

const FILTERS: Record<AnimalFilter, Prisma.AnimalWhereInput> = {
  all: {},
  dogs: { species: 'DOG' },
  cats: { species: 'CAT' },
  available: { available: true },
  unavailable: { available: false },
};

/** The text is matched literally: % and _ typed by the NGO are not wildcards. */
export function likePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, '\\$&')}%`;
}

@Injectable()
export class AnimalsRepository extends IAnimalsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  findPublicById(id: string): Promise<PublicAnimalRecord | null> {
    return this.prisma.animal.findFirst({
      where: { id, ngo: { status: 'ACTIVE' } },
      include: { ...WITH_IMAGES, ngo: true },
    });
  }

  async findAllOfNgo(
    ngoId: string,
    { search, filter }: AnimalListQuery,
  ): Promise<AnimalWithImages[]> {
    const where: Prisma.AnimalWhereInput = { ngoId, ...FILTERS[filter] };
    if (search) {
      // Prisma has no unaccent: the matching ids come from SQL (DASH-04).
      const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM animals
        WHERE ngo_id = ${ngoId}
          AND unaccent(name) ILIKE unaccent(${likePattern(search)})`);
      where.id = { in: rows.map((row) => row.id) };
    }
    return this.prisma.animal.findMany({
      where,
      include: WITH_IMAGES,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  findOwn(tx: Tx, ngoId: string, id: string): Promise<AnimalWithImages | null> {
    return tx.animal.findFirst({ where: { id, ngoId }, include: WITH_IMAGES });
  }

  create(tx: Tx, data: NewAnimal): Promise<Animal> {
    return tx.animal.create({ data });
  }

  update(
    tx: Tx,
    ngoId: string,
    id: string,
    data: AnimalChanges,
  ): Promise<Animal> {
    return tx.animal.update({ where: { id, ngoId }, data });
  }

  async delete(tx: Tx, ngoId: string, id: string): Promise<void> {
    await tx.animal.delete({ where: { id, ngoId } });
  }
}
