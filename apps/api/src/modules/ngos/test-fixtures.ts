import type { Animal, AnimalImage } from '@/generated/prisma/client.js';
import type {
  NgoAnimalRecord,
  NgoWithHours,
} from './repositories/ngos.repository.interface.js';
import type { DayHours } from './services/open-status.js';

export const NGO_ID = 'b3f1d6a2-8c4e-4a7b-9f0d-2e5c6a1b7d33';

/** Monday to Friday 09:00–18:00, closed on the weekend. */
export function weekHours(): DayHours[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) =>
    dayOfWeek === 0 || dayOfWeek === 6
      ? { dayOfWeek, closed: true, opensAt: null, closesAt: null }
      : { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '18:00' },
  );
}

export function makeNgo(overrides: Partial<NgoWithHours> = {}): NgoWithHours {
  const id = overrides.id ?? NGO_ID;
  return {
    id,
    cnpj: '11222333000181',
    legalName: 'Patas do Bairro',
    slug: 'patas-do-bairro',
    description: 'Resgatamos cães e gatos na zona sul de São Paulo.',
    imageKey: `ngos/${id}/logo/4f2a1c3e-5b6d-4e7f-8a9b-0c1d2e3f4a5b`,
    imageBytes: 30_000,
    email: 'contato@patas.org',
    whatsapp: '5511987654321',
    passwordHash: '$argon2id$hash',
    cep: '04101300',
    street: 'Rua Vergueiro',
    number: '3000',
    complement: null,
    district: 'Vila Mariana',
    city: 'São Paulo',
    uf: 'SP',
    lat: -23.5869,
    lng: -46.6347,
    locationConfirmedAt: new Date('2026-10-20T12:00:00.000Z'),
    timezone: 'America/Sao_Paulo',
    status: 'ACTIVE',
    isSeed: false,
    expiresAt: new Date('2026-10-27T12:00:00.000Z'),
    termsAcceptedAt: new Date('2026-10-20T12:00:00.000Z'),
    termsVersion: '2026-10-demo',
    signupRequestId: '0f8e7d6c-5b4a-4392-8170-6f5e4d3c2b1a',
    signupIpHash: 'f'.repeat(64),
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    updatedAt: new Date('2026-10-20T12:00:00.000Z'),
    openingHours: weekHours().map((day) => ({
      id: `hours-${day.dayOfWeek}`,
      ngoId: id,
      ...day,
    })),
    ...overrides,
  };
}

export function makeNgoAnimal(
  overrides: Partial<Animal> = {},
  images: AnimalImage[] = [],
): NgoAnimalRecord {
  return {
    id: '5d0e8a51-6c2b-4f3a-8e7d-1a9b0c2d3e44',
    ngoId: NGO_ID,
    name: 'Mel',
    species: 'CAT',
    breed: null,
    sex: 'FEMALE',
    size: 'SMALL',
    ageValue: 2,
    ageUnit: 'YEARS',
    description: null,
    available: true,
    availableChangedAt: new Date('2026-10-20T12:00:00.000Z'),
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    updatedAt: new Date('2026-10-20T12:00:00.000Z'),
    images,
    ...overrides,
  };
}
