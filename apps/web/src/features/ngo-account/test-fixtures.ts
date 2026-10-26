import type { DayHours, MyNgo, ProfileValues } from './ngo-account.types';

const NGO_ID = '6f1c2b52-0c55-4d43-9d3b-1f0b7a1d2c01';

/** One-pixel PNG: stories never fetch real photos. */
export const LOCAL_IMAGE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4uSgbAAQOAdfMZCtrAAAAAElFTkSuQmCC';

/** Sunday closed, the other days 09:00–18:00. */
export function makeWeek(): DayHours[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 0,
    opensAt: dayOfWeek === 0 ? null : '09:00',
    closesAt: dayOfWeek === 0 ? null : '18:00',
  }));
}

export function makeMyNgo(overrides: Partial<MyNgo> = {}): MyNgo {
  return {
    id: NGO_ID,
    slug: 'patas-do-bairro',
    cnpj: '11222333000181',
    legalName: 'Patas do Bairro',
    description: 'Resgatamos cães e gatos na Vila Mariana desde 2015.',
    imageUrl: null,
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
    weekHours: makeWeek(),
    openNow: true,
    todayIndex: 1,
    expiresAt: '2026-10-27T12:00:00.000Z',
    createdAt: '2026-10-20T12:00:00.000Z',
    ...overrides,
  };
}

/** The profile of `makeMyNgo()` as the form holds it (masked CEP and WhatsApp). */
export function makeProfileValues(
  overrides: Partial<ProfileValues> = {},
): ProfileValues {
  return {
    legalName: 'Patas do Bairro',
    description: 'Resgatamos cães e gatos na Vila Mariana desde 2015.',
    email: 'contato@patas.org',
    whatsapp: '(11) 98765-4321',
    cep: '04101-300',
    street: 'Rua Vergueiro',
    number: '3000',
    complement: '',
    district: 'Vila Mariana',
    city: 'São Paulo',
    uf: 'SP',
    location: {
      lat: -23.5869,
      lng: -46.6347,
      confirmedAt: '2026-10-20T12:00:00.000Z',
    },
    openingHours: makeWeek(),
    ...overrides,
  };
}
