import type { AnimalImage } from '@/generated/prisma/client.js';
import { makeNgo } from '@/modules/ngos/test-fixtures.js';
import type {
  AnimalWithImages,
  PublicAnimalRecord,
} from './repositories/animals.repository.interface.js';

export const NGO_ID = 'b3f1d6a2-8c4e-4a7b-9f0d-2e5c6a1b7d33';
export const ANIMAL_ID = '5d0e8a51-6c2b-4f3a-8e7d-1a9b0c2d3e44';

/** Saved photo of the animal at `position`. */
export function makeImage(
  position: number,
  overrides: Partial<AnimalImage> = {},
): AnimalImage {
  const id = overrides.id ?? `9a7f3c21-4b5d-4e6f-8a9b-0c1d2e3f4a5${position}`;
  return {
    id,
    ngoId: NGO_ID,
    animalId: ANIMAL_ID,
    position,
    keyPrefix: `ngos/${NGO_ID}/images/${id}`,
    bytes: 120_000,
    width: 1200,
    height: 900,
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  };
}

export function makeAnimal(
  overrides: Partial<AnimalWithImages> = {},
): AnimalWithImages {
  return {
    id: ANIMAL_ID,
    ngoId: NGO_ID,
    name: 'Mel',
    species: 'CAT',
    breed: 'SRD (vira-lata)',
    sex: 'FEMALE',
    size: 'SMALL',
    ageValue: 2,
    ageUnit: 'YEARS',
    description: 'Calma e carinhosa.',
    available: true,
    availableChangedAt: new Date('2026-10-20T12:00:00.000Z'),
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    updatedAt: new Date('2026-10-20T12:00:00.000Z'),
    images: [makeImage(0)],
    ...overrides,
  };
}

export function makePublicAnimal(
  overrides: Partial<PublicAnimalRecord> = {},
): PublicAnimalRecord {
  const { openingHours: _hours, ...ngo } = makeNgo({ id: NGO_ID });
  return { ...makeAnimal(), ngo, ...overrides };
}
