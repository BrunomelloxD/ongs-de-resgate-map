import type { MyAnimal, MyNgo } from './dashboard.types';

const NGO_ID = '6f1c2b52-0c55-4d43-9d3b-1f0b7a1d2c01';

/** One-pixel PNG: stories never fetch real photos. */
export const LOCAL_IMAGE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4uSgbAAQOAdfMZCtrAAAAAElFTkSuQmCC';

export function makeMyNgo(overrides: Partial<MyNgo> = {}): MyNgo {
  return {
    id: NGO_ID,
    slug: 'patas-do-bairro',
    cnpj: '11222333000181',
    legalName: 'Patas do Bairro',
    description: 'Resgatamos cães e gatos na Vila Mariana desde 2015.',
    imageUrl: `/img/ngos/${NGO_ID}/logo/0b9f3a3e-5d7c-4c1b-8a2e-3f4d5e6a7b8c-600.webp`,
    email: 'contato@patas.org',
    whatsapp: '5511987654321',
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
    locationConfirmedAt: '2026-10-20T12:00:00.000Z',
    timezone: 'America/Sao_Paulo',
    weekHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      closed: dayOfWeek === 0,
      opensAt: dayOfWeek === 0 ? null : '09:00',
      closesAt: dayOfWeek === 0 ? null : '18:00',
    })),
    openNow: true,
    todayIndex: 1,
    expiresAt: '2026-10-27T12:00:00.000Z',
    createdAt: '2026-10-20T12:00:00.000Z',
    ...overrides,
  };
}

export function makeMyAnimal(overrides: Partial<MyAnimal> = {}): MyAnimal {
  const id = overrides.id ?? '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';
  const name = overrides.name ?? 'Mel';
  return {
    id,
    name,
    species: 'CAT',
    breed: null,
    sex: 'FEMALE',
    size: 'SMALL',
    ageValue: 2,
    ageUnit: 'YEARS',
    description: null,
    available: true,
    images: [
      {
        id: '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b',
        url: `/img/ngos/${NGO_ID}/images/2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b-1200.webp`,
        thumbUrl: `/img/ngos/${NGO_ID}/images/2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b-160.webp`,
        width: 1200,
        height: 900,
        alt: `${name}, gato, porte pequeno`,
      },
    ],
    availableChangedAt: '2026-10-20T12:00:00.000Z',
    createdAt: '2026-10-20T12:00:00.000Z',
    ...overrides,
  };
}

/** Different species and availability, for the search and filter (DASH-04, DASH-05). */
export const MIXED_ANIMALS: MyAnimal[] = [
  makeMyAnimal({
    id: 'a0000000-0000-4000-8000-000000000001',
    name: 'João',
    species: 'DOG',
    sex: 'MALE',
    size: 'MEDIUM',
  }),
  makeMyAnimal({
    id: 'a0000000-0000-4000-8000-000000000002',
    name: 'Mel',
    species: 'CAT',
  }),
  makeMyAnimal({
    id: 'a0000000-0000-4000-8000-000000000003',
    name: 'Joana',
    species: 'CAT',
    available: false,
  }),
  makeMyAnimal({
    id: 'a0000000-0000-4000-8000-000000000004',
    name: 'Paçoca',
    species: 'DOG',
    available: false,
  }),
];
