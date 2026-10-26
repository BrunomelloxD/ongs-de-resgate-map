import type { MyAnimal, Photo } from './animal-form.types';

const NGO_ID = '6f1c2b52-0c55-4d43-9d3b-1f0b7a1d2c01';

/** One-pixel PNG: stories never fetch real photos. */
export const LOCAL_IMAGE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4uSgbAAQOAdfMZCtrAAAAAElFTkSuQmCC';

/** Uploaded photo with an api id; `n` makes a distinct uuid. */
export function makePhoto(n: number, overrides: Partial<Photo> = {}): Photo {
  return {
    key: `saved-${n}`,
    status: 'done',
    id: `0000000${n}-0000-4000-8000-000000000000`,
    previewUrl: LOCAL_IMAGE_URL,
    ...overrides,
  };
}

export function makeMyAnimal(overrides: Partial<MyAnimal> = {}): MyAnimal {
  const name = overrides.name ?? 'Caramelo';
  const image = (imageId: string) => ({
    id: imageId,
    url: `/img/ngos/${NGO_ID}/images/${imageId}-1200.webp`,
    mediumUrl: `/img/ngos/${NGO_ID}/images/${imageId}-600.webp`,
    thumbUrl: `/img/ngos/${NGO_ID}/images/${imageId}-160.webp`,
    width: 1200,
    height: 900,
    alt: `${name}, cão, porte médio`,
  });
  return {
    id: '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f',
    name,
    species: 'DOG',
    breed: 'SRD (vira-lata)',
    sex: 'MALE',
    size: 'MEDIUM',
    ageValue: 3,
    ageUnit: 'YEARS',
    description: 'Calmo, adora passear de coleira.',
    available: true,
    images: [
      image('2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b'),
      image('3f4a5b6c-7d8e-4f9a-8b1c-2d3e4f5a6b7c'),
    ],
    availableChangedAt: '2026-10-20T12:00:00.000Z',
    createdAt: '2026-10-20T12:00:00.000Z',
    ...overrides,
  };
}
