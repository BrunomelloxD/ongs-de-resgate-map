import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED_NGOS } from './ngo.seed.js';
import { uploadSeedImage } from './seed-media.js';

interface SeedAnimal {
  /** Last 3 digits of the fixed ids (animal and photos). */
  n: number;
  ngo: string;
  name: string;
  species: 'DOG' | 'CAT' | 'OTHER';
  breed: string | null;
  sex: 'MALE' | 'FEMALE';
  size: 'SMALL' | 'MEDIUM' | 'LARGE';
  ageValue: number;
  ageUnit: 'MONTHS' | 'YEARS';
  description: string;
  available: boolean;
  /** Files of `prisma/seeds/assets/`; the first is the cover (position 0). */
  photos: string[];
}

// DEMO-19 and MAP-20: one NGO has no animals, and some animals are unavailable.
const ANIMALS: readonly SeedAnimal[] = [
  {
    n: 1,
    ngo: 'patas-do-bairro',
    name: 'Caramelo',
    species: 'DOG',
    breed: null,
    sex: 'MALE',
    size: 'MEDIUM',
    ageValue: 3,
    ageUnit: 'YEARS',
    description:
      'Brincalhão e dócil. Convive bem com outros cães e com crianças.',
    available: true,
    photos: ['caramelo-dog-59.jpg'],
  },
  {
    n: 2,
    ngo: 'patas-do-bairro',
    name: 'Mel',
    species: 'DOG',
    breed: null,
    sex: 'FEMALE',
    size: 'SMALL',
    ageValue: 8,
    ageUnit: 'MONTHS',
    description: 'Filhote cheia de energia, já vacinada e vermifugada.',
    available: true,
    photos: ['01-puppy-portrait-kim-8-weeks.jpg'],
  },
  {
    n: 3,
    ngo: 'patas-do-bairro',
    name: 'Nina',
    species: 'CAT',
    breed: 'Sem raça definida',
    sex: 'FEMALE',
    size: 'SMALL',
    ageValue: 2,
    ageUnit: 'YEARS',
    description: 'Gata de olhos azuis, calma e carinhosa.',
    available: true,
    photos: ['tabby-cat-with-blue-eyes-3336579.jpg'],
  },
  {
    n: 4,
    ngo: 'patas-do-bairro',
    name: 'Thor',
    species: 'DOG',
    breed: null,
    sex: 'MALE',
    size: 'LARGE',
    ageValue: 5,
    ageUnit: 'YEARS',
    description: 'Já foi adotado e vive com a família nova.',
    available: false,
    photos: ['rescue-dog-in-finland.jpg'],
  },
  {
    n: 5,
    ngo: 'gatil-esperanca',
    name: 'Luna',
    species: 'CAT',
    breed: null,
    sex: 'FEMALE',
    size: 'SMALL',
    ageValue: 1,
    ageUnit: 'YEARS',
    description: 'Castrada e vacinada. Gosta de colo e de janela.',
    available: true,
    photos: ['blue-and-white-tabby-cat-img-6442.jpg'],
  },
  {
    n: 6,
    ngo: 'gatil-esperanca',
    name: 'Mingau',
    species: 'CAT',
    breed: null,
    sex: 'MALE',
    size: 'MEDIUM',
    ageValue: 4,
    ageUnit: 'YEARS',
    description: 'Tranquilo, convive bem com outros gatos.',
    available: true,
    photos: ['closeup-portrait-of-cat-and-its-whiskers.jpg'],
  },
  {
    n: 7,
    ngo: 'gatil-esperanca',
    name: 'Tigre',
    species: 'CAT',
    breed: null,
    sex: 'MALE',
    size: 'MEDIUM',
    ageValue: 6,
    ageUnit: 'MONTHS',
    description: 'Filhote curioso. Já foi adotado.',
    available: false,
    photos: ['tabby-cat-img-6135-02.jpg'],
  },
  {
    n: 8,
    ngo: 'amigos-de-quatro-patas',
    name: 'Bob',
    species: 'DOG',
    breed: null,
    sex: 'MALE',
    size: 'MEDIUM',
    ageValue: 2,
    ageUnit: 'YEARS',
    description: 'Companheiro, anda bem na guia.',
    available: true,
    photos: ['cachorro-esperando-na-adocao-20240623.jpg'],
  },
  {
    n: 9,
    ngo: 'amigos-de-quatro-patas',
    name: 'Zeca',
    species: 'DOG',
    breed: null,
    sex: 'MALE',
    size: 'LARGE',
    ageValue: 4,
    ageUnit: 'YEARS',
    description: 'Grande e gentil. Tem três fotos para você conhecer melhor.',
    available: true,
    photos: [
      'cachorro-esperando-na-adocao-2-20240623-dsc03735.jpg',
      'cachorro-esperando-na-adocao-3-20240623-dsc03735.jpg',
      'cachorro-esperando-na-adocao-4-20240623-dsc03735.jpg',
    ],
  },
  {
    n: 10,
    ngo: 'casa-pet-solidaria',
    name: 'Pretinha',
    species: 'DOG',
    breed: null,
    sex: 'FEMALE',
    size: 'MEDIUM',
    ageValue: 7,
    ageUnit: 'YEARS',
    description: 'Idosa e tranquila, ótima para apartamento.',
    available: true,
    photos: ['dog-village-ada-fundation-poland-2.jpg'],
  },
];

const pad = (n: number) => String(n).padStart(3, '0');

export async function seedAnimals(prisma: PrismaClient): Promise<number> {
  const ngoIds = new Map(SEED_NGOS.map((ngo) => [ngo.slug, ngo.id]));

  for (const { n, ngo, photos, ...fields } of ANIMALS) {
    const ngoId = ngoIds.get(ngo)!;
    const id = `5eed0002-0000-4000-8000-000000000${pad(n)}`;

    await prisma.animal.upsert({
      where: { id },
      update: { ngoId, ...fields },
      create: { id, ngoId, ...fields },
    });

    // Every saved photo has an animal and a position (0 = cover).
    for (const [position, file] of photos.entries()) {
      const imageId = `5eed0003-0000-4000-8000-${pad(n)}00000000${position}`;
      const keyPrefix = `ngos/${ngoId}/images/${imageId}`;
      const image = await uploadSeedImage(file, keyPrefix, 'animal');
      await prisma.animalImage.upsert({
        where: { id: imageId },
        update: { animalId: id, position, keyPrefix, ...image },
        create: {
          id: imageId,
          ngoId,
          animalId: id,
          position,
          keyPrefix,
          ...image,
        },
      });
    }
  }
  return ANIMALS.length;
}
