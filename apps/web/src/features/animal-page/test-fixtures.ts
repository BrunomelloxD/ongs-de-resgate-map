import type { AnimalImage, AnimalPublic } from './animal-page.types';

const NGO_ID = '6f1c2b52-0c55-4d43-9d3b-1f0b7a1d2c01';
const IMAGE_IDS = [
  '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b',
  '3f4a5b6c-7d8e-4f9a-8b1c-2d3e4f5a6b7c',
  '4a5b6c7d-8e9f-4a0b-9c2d-3e4f5a6b7c8d',
];

export function makeImages(
  count = 3,
  alt = 'Caramelo, cão, porte médio',
): AnimalImage[] {
  return IMAGE_IDS.slice(0, count).map((id) => ({
    id,
    url: `/img/ngos/${NGO_ID}/images/${id}-1200.webp`,
    mediumUrl: `/img/ngos/${NGO_ID}/images/${id}-600.webp`,
    thumbUrl: `/img/ngos/${NGO_ID}/images/${id}-160.webp`,
    width: 1200,
    height: 900,
    alt,
  }));
}

export function makeAnimal(
  overrides: Partial<AnimalPublic> = {},
): AnimalPublic {
  return {
    id: '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f',
    name: 'Caramelo',
    species: 'DOG',
    breed: 'SRD (vira-lata)',
    sex: 'MALE',
    size: 'MEDIUM',
    ageValue: 3,
    ageUnit: 'YEARS',
    description: 'Brincalhão, se dá bem com crianças e outros cães.',
    available: true,
    images: makeImages(),
    whatsappUrl: `https://wa.me/5511987654321?text=${encodeURIComponent('Olá! Vi o Caramelo no Animal Helper e quero saber como adotar.')}`,
    ngo: {
      id: NGO_ID,
      slug: 'patas-do-bairro',
      name: 'Patas do Bairro',
      imageUrl: `/img/ngos/${NGO_ID}/logo/0b9f3a3e-5d7c-4c1b-8a2e-3f4d5e6a7b8c-160.webp`,
      city: 'São Paulo',
      uf: 'SP',
    },
    ...overrides,
  };
}

/** One-pixel PNG: stories never fetch real photos. */
export const LOCAL_IMAGE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4uSgbAAQOAdfMZCtrAAAAAElFTkSuQmCC';
