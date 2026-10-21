import { randomBytes } from 'node:crypto';
import { hash } from 'argon2';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { uploadSeedImage } from './seed-media.js';

interface Day {
  opensAt: string;
  closesAt: string;
}

export interface SeedNgo {
  id: string;
  cnpj: string;
  name: string;
  slug: string;
  description: string;
  logoId: string;
  /** File of `prisma/seeds/assets/` used as the NGO image. */
  logoFile: string;
  whatsapp: string;
  cep: string;
  street: string;
  number: string;
  district: string;
  lat: number;
  lng: number;
  /** Monday to Friday, Saturday and Sunday (null = closed). */
  weekdays: Day;
  saturday: Day | null;
  sunday: Day | null;
}

const WEEK: Day = { opensAt: '09:00', closesAt: '18:00' };

// Fixed ids and keys: running the seeder again updates the same rows and objects (DEMO-19).
// MAP-20: "Recanto Bicho Feliz" is active and has no animals.
export const SEED_NGOS: readonly SeedNgo[] = [
  {
    id: '5eed0001-0000-4000-8000-000000000001',
    cnpj: '51820467000119',
    name: 'Patas do Bairro',
    slug: 'patas-do-bairro',
    description:
      'Resgatamos cães e gatos abandonados na zona sul de São Paulo e cuidamos deles até encontrar uma família. Atendemos pelo WhatsApp e marcamos visitas no abrigo.',
    logoId: '5eed0001-1000-4000-8000-000000000001',
    logoFile: 'caramelo-dog-59.jpg',
    whatsapp: '5511987650001',
    cep: '04101300',
    street: 'Rua Vergueiro',
    number: '3000',
    district: 'Vila Mariana',
    lat: -23.5869,
    lng: -46.6347,
    weekdays: WEEK,
    saturday: { opensAt: '09:00', closesAt: '13:00' },
    sunday: null,
  },
  {
    id: '5eed0001-0000-4000-8000-000000000002',
    cnpj: '51820468000163',
    name: 'Gatil Esperança',
    slug: 'gatil-esperanca',
    description:
      'Abrigo só de gatos, em Pinheiros. Todos chegam castrados, vacinados e testados. Visitas com horário marcado.',
    logoId: '5eed0001-1000-4000-8000-000000000002',
    logoFile: 'blue-and-white-tabby-cat-img-6442.jpg',
    whatsapp: '5511987650002',
    cep: '05422001',
    street: 'Rua dos Pinheiros',
    number: '800',
    district: 'Pinheiros',
    lat: -23.5663,
    lng: -46.6896,
    weekdays: { opensAt: '10:00', closesAt: '17:00' },
    saturday: { opensAt: '10:00', closesAt: '16:00' },
    sunday: { opensAt: '10:00', closesAt: '14:00' },
  },
  {
    id: '5eed0001-0000-4000-8000-000000000003',
    cnpj: '51820469000108',
    name: 'Amigos de Quatro Patas',
    slug: 'amigos-de-quatro-patas',
    description:
      'Cuidamos de cães resgatados na zona norte de São Paulo. Fazemos feiras de adoção aos sábados.',
    logoId: '5eed0001-1000-4000-8000-000000000003',
    logoFile: 'cachorro-esperando-na-adocao-20240623.jpg',
    whatsapp: '5511987650003',
    cep: '02012000',
    street: 'Avenida Cruzeiro do Sul',
    number: '1500',
    district: 'Santana',
    lat: -23.5058,
    lng: -46.6254,
    weekdays: { opensAt: '08:00', closesAt: '17:00' },
    saturday: { opensAt: '08:00', closesAt: '12:00' },
    sunday: null,
  },
  {
    id: '5eed0001-0000-4000-8000-000000000004',
    cnpj: '51820470000132',
    name: 'Casa Pet Solidária',
    slug: 'casa-pet-solidaria',
    description: 'Lar temporário e adoção de cães e gatos na zona leste.',
    logoId: '5eed0001-1000-4000-8000-000000000004',
    logoFile: 'dog-village-ada-fundation-poland-2.jpg',
    whatsapp: '5511987650004',
    cep: '03636000',
    street: 'Avenida Penha de França',
    number: '600',
    district: 'Penha',
    lat: -23.5262,
    lng: -46.5421,
    weekdays: WEEK,
    saturday: null,
    sunday: null,
  },
  {
    id: '5eed0001-0000-4000-8000-000000000005',
    cnpj: '51820471000187',
    name: 'Recanto Bicho Feliz',
    slug: 'recanto-bicho-feliz',
    description:
      'ONG nova em Santo Amaro, ainda sem animais para adoção. Acompanhe: em breve teremos novidades.',
    logoId: '5eed0001-1000-4000-8000-000000000005',
    logoFile: 'tabby-cat-with-blue-eyes-3336579.jpg',
    whatsapp: '5511987650005',
    cep: '04753000',
    street: 'Avenida Adolfo Pinheiro',
    number: '1200',
    district: 'Santo Amaro',
    lat: -23.6544,
    lng: -46.7094,
    weekdays: WEEK,
    saturday: null,
    sunday: null,
  },
];

function hoursOf(ngo: SeedNgo) {
  const byDay = (day: Day | null, dayOfWeek: number) => ({
    dayOfWeek,
    closed: day === null,
    opensAt: day?.opensAt ?? null,
    closesAt: day?.closesAt ?? null,
  });
  return [
    byDay(ngo.sunday, 0),
    ...[1, 2, 3, 4, 5].map((dayOfWeek) => byDay(ngo.weekdays, dayOfWeek)),
    byDay(ngo.saturday, 6),
  ];
}

export async function seedNgos(prisma: PrismaClient): Promise<number> {
  for (const ngo of SEED_NGOS) {
    const imageKey = `ngos/${ngo.id}/logo/${ngo.logoId}`;
    const { bytes } = await uploadSeedImage(ngo.logoFile, imageKey, 'ngo');

    const data = {
      legalName: ngo.name,
      slug: ngo.slug,
      description: ngo.description,
      imageKey,
      imageBytes: bytes,
      email: `${ngo.slug}@seed.animal-helper.example`,
      whatsapp: ngo.whatsapp,
      cep: ngo.cep,
      street: ngo.street,
      number: ngo.number,
      district: ngo.district,
      city: 'São Paulo',
      uf: 'SP',
      lat: ngo.lat,
      lng: ngo.lng,
      timezone: 'America/Sao_Paulo',
      status: 'ACTIVE' as const,
      isSeed: true,
      expiresAt: null,
      termsVersion: '2026-10-demo',
    };
    const dates = {
      locationConfirmedAt: new Date(),
      termsAcceptedAt: new Date(),
    };

    const saved = await prisma.ngo.upsert({
      where: { cnpj: ngo.cnpj },
      update: data,
      create: {
        id: ngo.id,
        cnpj: ngo.cnpj,
        ...data,
        ...dates,
        // Random and thrown away: a seed NGO never logs in (DEMO-19).
        passwordHash: await hash(randomBytes(32).toString('hex')),
      },
    });

    for (const hours of hoursOf(ngo)) {
      await prisma.openingHours.upsert({
        where: {
          ngoId_dayOfWeek: { ngoId: saved.id, dayOfWeek: hours.dayOfWeek },
        },
        update: hours,
        create: { ngoId: saved.id, ...hours },
      });
    }
  }
  return SEED_NGOS.length;
}
