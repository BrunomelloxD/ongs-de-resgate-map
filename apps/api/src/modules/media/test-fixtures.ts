import type { AnimalImage } from '@/generated/prisma/client.js';

export const NGO_ID = 'b3f1d6a2-8c4e-4a7b-9f0d-2e5c6a1b7d33';
export const ANIMAL_ID = '5d0e8a51-6c2b-4f3a-8e7d-1a9b0c2d3e44';

export function makeAnimalImage(
  overrides: Partial<AnimalImage> = {},
): AnimalImage {
  const id = overrides.id ?? '9a7f3c21-4b5d-4e6f-8a9b-0c1d2e3f4a55';
  const ngoId = overrides.ngoId ?? NGO_ID;
  return {
    id,
    ngoId,
    animalId: null,
    position: null,
    keyPrefix: `ngos/${ngoId}/images/${id}`,
    bytes: 120_000,
    width: 1200,
    height: 900,
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  };
}
