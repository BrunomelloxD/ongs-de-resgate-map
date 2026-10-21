import type { DayHours, NgoAnimal, NgoPublic } from './ngo-page.types';

const NGO_ID = '6f1c2b52-0c55-4d43-9d3b-1f0b7a1d2c01';

const OPEN: Omit<DayHours, 'dayOfWeek'> = {
  closed: false,
  opensAt: '09:00',
  closesAt: '18:00',
};

export const WEEK_HOURS: DayHours[] = [
  { dayOfWeek: 0, closed: true, opensAt: null, closesAt: null },
  { dayOfWeek: 1, ...OPEN },
  { dayOfWeek: 2, ...OPEN },
  { dayOfWeek: 3, ...OPEN },
  { dayOfWeek: 4, ...OPEN },
  { dayOfWeek: 5, ...OPEN },
  { dayOfWeek: 6, closed: false, opensAt: '09:00', closesAt: '13:00' },
];

export function makeNgo(overrides: Partial<NgoPublic> = {}): NgoPublic {
  return {
    id: NGO_ID,
    slug: 'patas-do-bairro',
    name: 'Patas do Bairro',
    description:
      'Resgatamos cães e gatos na Vila Mariana desde 2015. Todos vacinados e castrados.',
    imageUrl: `/img/ngos/${NGO_ID}/logo/0b9f3a3e-5d7c-4c1b-8a2e-3f4d5e6a7b8c-600.webp`,
    whatsappUrl: `https://wa.me/5511987654321?text=${encodeURIComponent('Olá! Vi a Patas do Bairro no Animal Helper.')}`,
    address: {
      cep: '04101300',
      street: 'Rua Vergueiro',
      number: '3000',
      complement: null,
      district: 'Vila Mariana',
      city: 'São Paulo',
      uf: 'SP',
    },
    lat: -23.5869,
    lng: -46.6347,
    openNow: true,
    weekHours: WEEK_HOURS,
    todayIndex: 1,
    hasAnimals: true,
    ...overrides,
  };
}

export function makeNgoAnimal(overrides: Partial<NgoAnimal> = {}): NgoAnimal {
  return {
    id: '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f',
    name: 'Mel',
    species: 'CAT',
    sex: 'FEMALE',
    size: 'SMALL',
    ageValue: 2,
    ageUnit: 'YEARS',
    available: true,
    cover: {
      url: `/img/ngos/${NGO_ID}/images/2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b-1200.webp`,
      thumbUrl: `/img/ngos/${NGO_ID}/images/2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b-160.webp`,
      width: 1200,
      height: 900,
      alt: 'Mel, gato, porte pequeno',
    },
    ...overrides,
  };
}

/** One-pixel PNG: stories never fetch real photos. */
export const LOCAL_IMAGE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4uSgbAAQOAdfMZCtrAAAAAElFTkSuQmCC';
