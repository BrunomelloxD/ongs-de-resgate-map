import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsObject, IsOptional } from 'class-validator';
import type { Species } from '@/generated/prisma/enums.js';
import type { Bbox } from '../../repositories/ngos.repository.interface.js';

const NUMBER = /^-?\d{1,3}(\.\d+)?$/;
/** MAPF-03: the map filters only dogs and cats. */
export const SEARCH_SPECIES = ['DOG', 'CAT'] as const;

/** "minLng,minLat,maxLng,maxLat" → Bbox, or null when malformed. */
export function parseBbox(value: unknown): Bbox | null {
  const parts = typeof value === 'string' ? value.split(',') : [];
  if (parts.length !== 4 || !parts.every((part) => NUMBER.test(part))) {
    return null;
  }
  const [minLng, minLat, maxLng, maxLat] = parts.map(Number);
  const valid =
    minLng >= -180 &&
    maxLng <= 180 &&
    minLat >= -90 &&
    maxLat <= 90 &&
    minLng < maxLng &&
    minLat < maxLat;
  return valid ? { minLng, minLat, maxLng, maxLat } : null;
}

/** "DOG,CAT" → ['DOG', 'CAT']; other values are left to the validators. */
export function splitList(value: unknown): unknown {
  return typeof value === 'string' ? value.split(',') : value;
}

export class SearchNgosDto {
  @ApiProperty({
    type: String,
    example: '-46.70,-23.60,-46.60,-23.50',
    description: 'minLng,minLat,maxLng,maxLat (graus)',
  })
  @Transform(({ value }) => parseBbox(value))
  @IsObject({ message: 'bbox deve ser minLng,minLat,maxLng,maxLat.' })
  bbox!: Bbox;

  @ApiPropertyOptional({
    type: String,
    example: 'DOG,CAT',
    description: 'ONGs com animal disponível de qualquer uma (MAPF-03)',
  })
  @IsOptional()
  @Transform(({ value }) => splitList(value))
  @IsArray()
  @IsIn(SEARCH_SPECIES, { each: true })
  species?: Species[];
}
