import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service.js';
import { type Ngo, Prisma, type Species } from '@/generated/prisma/client.js';
import type { DayHours } from '../services/open-status.js';
import {
  type AnimalFilters,
  type Bbox,
  INgosRepository,
  type NewNgo,
  type NgoAnimalRecord,
  type NgoPublicRecord,
  type NgoWithHours,
  type PageParams,
  SEARCH_LIMIT,
  type SearchResult,
  type Tx,
} from './ngos.repository.interface.js';

const WITH_HOURS = {
  openingHours: { orderBy: { dayOfWeek: 'asc' } },
} satisfies Prisma.NgoInclude;

function hourFields({ dayOfWeek, closed, opensAt, closesAt }: DayHours) {
  return { dayOfWeek, closed, opensAt, closesAt };
}

@Injectable()
export class NgosRepository extends INgosRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  async searchByBbox(
    { minLng, minLat, maxLng, maxLat }: Bbox,
    species: readonly Species[],
  ): Promise<SearchResult> {
    // The visitor's center never reaches the api (SEC-01): order by the bbox center.
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const withSpecies =
      species.length === 0
        ? Prisma.empty
        : Prisma.sql`AND EXISTS (
            SELECT 1 FROM animals a
            WHERE a.ngo_id = n.id AND a.available
              AND a.species::text = ANY(${[...species]}::text[]))`;

    // Plain SQL over lat/lng (AD-005). One extra row tells whether it was cut.
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT n.id FROM ngos n
      WHERE n.status = 'ACTIVE'
        AND n.lat BETWEEN ${minLat}::float8 AND ${maxLat}::float8
        AND n.lng BETWEEN ${minLng}::float8 AND ${maxLng}::float8
        ${withSpecies}
      ORDER BY power(n.lat - ${centerLat}::float8, 2)
        + power((n.lng - ${centerLng}::float8) * cos(radians(${centerLat}::float8)), 2),
        n.id
      LIMIT ${SEARCH_LIMIT + 1}`);

    const ids = rows.slice(0, SEARCH_LIMIT).map((row) => row.id);
    const found = await this.prisma.ngo.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      include: WITH_HOURS,
    });
    const byId = new Map(found.map((ngo) => [ngo.id, ngo]));
    return {
      items: ids.flatMap((id) => byId.get(id) ?? []),
      truncated: rows.length > SEARCH_LIMIT,
    };
  }

  findActiveBySlug(slug: string): Promise<NgoPublicRecord | null> {
    return this.prisma.ngo.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: { ...WITH_HOURS, _count: { select: { animals: true } } },
    });
  }

  async findAnimals(
    ngoId: string,
    { species, sex, size, available }: AnimalFilters,
    { skip, take }: PageParams,
  ): Promise<{ items: NgoAnimalRecord[]; total: number }> {
    const where: Prisma.AnimalWhereInput = {
      ngoId,
      species,
      sex,
      size,
      ...(available ? { available: true } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.animal.findMany({
        where,
        include: { images: { where: { position: 0 } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.animal.count({ where }),
    ]);
    return { items, total };
  }

  create(
    tx: Tx,
    data: NewNgo,
    hours: readonly DayHours[],
  ): Promise<NgoWithHours> {
    return tx.ngo.create({
      data: { ...data, openingHours: { create: hours.map(hourFields) } },
      include: WITH_HOURS,
    });
  }

  async findSlugsStartingWith(tx: Tx, base: string): Promise<string[]> {
    const rows = await tx.ngo.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  }

  findBySignupRequestId(id: string): Promise<NgoWithHours | null> {
    return this.prisma.ngo.findUnique({
      where: { signupRequestId: id },
      include: WITH_HOURS,
    });
  }

  findByEmail(email: string): Promise<Ngo | null> {
    return this.prisma.ngo.findUnique({ where: { email } });
  }

  async existsByCnpj(cnpj: string): Promise<boolean> {
    return (await this.prisma.ngo.count({ where: { cnpj } })) > 0;
  }

  // citext: the comparison ignores case, like the unique index.
  async existsByEmail(email: string): Promise<boolean> {
    return (await this.prisma.ngo.count({ where: { email } })) > 0;
  }

  findById(id: string): Promise<NgoWithHours | null> {
    return this.prisma.ngo.findUnique({ where: { id }, include: WITH_HOURS });
  }

  update(
    id: string,
    data: Prisma.NgoUpdateInput,
    hours?: readonly DayHours[],
  ): Promise<NgoWithHours> {
    // One statement: the NGO and its 7 days change together or not at all.
    const openingHours = hours && {
      upsert: hours.map((day) => ({
        where: { ngoId_dayOfWeek: { ngoId: id, dayOfWeek: day.dayOfWeek } },
        create: hourFields(day),
        update: hourFields(day),
      })),
    };
    return this.prisma.ngo.update({
      where: { id },
      data: { ...data, openingHours },
      include: WITH_HOURS,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ngo.delete({ where: { id } });
  }
}
