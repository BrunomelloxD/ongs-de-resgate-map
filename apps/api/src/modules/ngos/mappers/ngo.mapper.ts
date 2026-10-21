import { buildNgoMessage, whatsappUrl } from '@/common/text/whatsapp.js';
import type { Size, Species } from '@/generated/prisma/enums.js';
import { imageUrl } from '@/modules/media/services/media.service.js';
import type { NgoAnimalDto } from '../dtos/response/ngo-animal-response.dto.js';
import type { NgoMeDto } from '../dtos/response/ngo-me-response.dto.js';
import type { NgoPinDto } from '../dtos/response/ngo-pin-response.dto.js';
import type {
  AddressDto,
  DayHoursDto,
  NgoPublicDto,
} from '../dtos/response/ngo-public-response.dto.js';
import type {
  NgoAnimalRecord,
  NgoPublicRecord,
  NgoWithHours,
} from '../repositories/ngos.repository.interface.js';
import { computeOpenStatus, type DayHours } from '../services/open-status.js';

// Image sizes from media's PROFILES: NGO 160/600, animal 160/1200.
const NGO_THUMB = 160;
const NGO_IMAGE = 600;
const ANIMAL_THUMB = 160;
const ANIMAL_IMAGE = 1200;

const SPECIES_LABEL: Record<Species, string> = {
  DOG: 'cão',
  CAT: 'gato',
  OTHER: 'outro',
};
const SIZE_LABEL: Record<Size, string> = {
  SMALL: 'pequeno',
  MEDIUM: 'médio',
  LARGE: 'grande',
};

/** A11Y-11: "{nome}, {espécie}, porte {porte}". */
export function animalAlt(name: string, species: Species, size: Size): string {
  return `${name}, ${SPECIES_LABEL[species]}, porte ${SIZE_LABEL[size]}`;
}

function day({ dayOfWeek, closed, opensAt, closesAt }: DayHours): DayHoursDto {
  return { dayOfWeek, closed, opensAt, closesAt };
}

/** Always the 7 days, Sunday first; a missing row reads as closed. */
function weekHours(hours: readonly DayHours[]): DayHoursDto[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const found = hours.find((h) => h.dayOfWeek === dayOfWeek);
    return found
      ? day(found)
      : { dayOfWeek, closed: true, opensAt: null, closesAt: null };
  });
}

function address(ngo: NgoWithHours): AddressDto {
  const { cep, street, number, complement, district, city, uf } = ngo;
  return { cep, street, number, complement, district, city, uf };
}

function ngoImage(imageKey: string | null, size: number): string | null {
  return imageKey ? imageUrl(imageKey, size) : null;
}

/** Model → DTO. Public DTOs never carry e-mail, CNPJ or hashes (SEC-04). */
export const NgoMapper = {
  toPin(ngo: NgoWithHours, now: Date): NgoPinDto {
    const { openNow, today } = computeOpenStatus(
      ngo.openingHours,
      ngo.timezone,
      now,
    );
    return {
      id: ngo.id,
      slug: ngo.slug,
      name: ngo.legalName,
      lat: ngo.lat,
      lng: ngo.lng,
      openNow,
      todayHours: today && {
        closed: today.closed,
        opensAt: today.opensAt,
        closesAt: today.closesAt,
      },
      thumbUrl: ngoImage(ngo.imageKey, NGO_THUMB),
    };
  },

  toPublic(ngo: NgoPublicRecord, now: Date): NgoPublicDto {
    const { openNow, todayIndex } = computeOpenStatus(
      ngo.openingHours,
      ngo.timezone,
      now,
    );
    return {
      id: ngo.id,
      slug: ngo.slug,
      name: ngo.legalName,
      description: ngo.description,
      imageUrl: ngoImage(ngo.imageKey, NGO_IMAGE),
      whatsappUrl: whatsappUrl(ngo.whatsapp, buildNgoMessage(ngo.legalName)),
      address: address(ngo),
      lat: ngo.lat,
      lng: ngo.lng,
      openNow,
      weekHours: weekHours(ngo.openingHours),
      todayIndex,
      hasAnimals: ngo._count.animals > 0,
    };
  },

  toMe(ngo: NgoWithHours, now: Date): NgoMeDto {
    const { openNow, todayIndex } = computeOpenStatus(
      ngo.openingHours,
      ngo.timezone,
      now,
    );
    return {
      id: ngo.id,
      slug: ngo.slug,
      cnpj: ngo.cnpj,
      legalName: ngo.legalName,
      description: ngo.description,
      imageUrl: ngoImage(ngo.imageKey, NGO_IMAGE),
      email: ngo.email,
      whatsapp: ngo.whatsapp,
      address: address(ngo),
      lat: ngo.lat,
      lng: ngo.lng,
      locationConfirmedAt: ngo.locationConfirmedAt,
      timezone: ngo.timezone,
      weekHours: weekHours(ngo.openingHours),
      openNow,
      todayIndex,
      expiresAt: ngo.expiresAt,
      createdAt: ngo.createdAt,
    };
  },

  /** The repository loads only the cover (position 0). */
  toAnimal(animal: NgoAnimalRecord): NgoAnimalDto {
    const [cover] = animal.images;
    return {
      id: animal.id,
      name: animal.name,
      species: animal.species,
      sex: animal.sex,
      size: animal.size,
      ageValue: animal.ageValue,
      ageUnit: animal.ageUnit,
      available: animal.available,
      cover: cover
        ? {
            url: imageUrl(cover.keyPrefix, ANIMAL_IMAGE),
            thumbUrl: imageUrl(cover.keyPrefix, ANIMAL_THUMB),
            width: cover.width,
            height: cover.height,
            alt: animalAlt(animal.name, animal.species, animal.size),
          }
        : null,
    };
  },
};
