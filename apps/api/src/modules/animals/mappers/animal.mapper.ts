import { buildAdoptionMessage, whatsappUrl } from '@/common/text/whatsapp.js';
import type { AnimalImage } from '@/generated/prisma/client.js';
import { imageUrl } from '@/modules/media/services/media.service.js';
import { animalAlt } from '@/modules/ngos/mappers/ngo.mapper.js';
import type {
  AnimalImageDto,
  AnimalMeDto,
  AnimalPublicDto,
} from '../dtos/response/animal-response.dto.js';
import type {
  AnimalWithImages,
  PublicAnimalRecord,
} from '../repositories/animals.repository.interface.js';

// Variants from media's PROFILES: animal 160/1200, NGO 160/600.
const THUMB = 160;
const LARGE = 1200;
const NGO_THUMB = 160;

/** ANI-02: the cover (position 0) first, whatever order the rows came in. */
function images(animal: AnimalWithImages): AnimalImageDto[] {
  const alt = animalAlt(animal.name, animal.species, animal.size);
  return (
    [...animal.images]
      // Saved photos always have a position; only pending ones have null.
      .sort((a, b) => a.position! - b.position!)
      .map((image: AnimalImage) => ({
        id: image.id,
        url: imageUrl(image.keyPrefix, LARGE),
        thumbUrl: imageUrl(image.keyPrefix, THUMB),
        width: image.width,
        height: image.height,
        alt,
      }))
  );
}

function base(animal: AnimalWithImages) {
  return {
    id: animal.id,
    name: animal.name,
    species: animal.species,
    breed: animal.breed,
    sex: animal.sex,
    size: animal.size,
    ageValue: animal.ageValue,
    ageUnit: animal.ageUnit,
    description: animal.description,
    available: animal.available,
    images: images(animal),
  };
}

/** Model → DTO. The public DTO never carries e-mail, CNPJ or hashes (SEC-04). */
export const AnimalMapper = {
  toPublic(animal: PublicAnimalRecord): AnimalPublicDto {
    const { ngo } = animal;
    return {
      ...base(animal),
      // ANI-05: no contact link while the animal is unavailable.
      whatsappUrl: animal.available
        ? whatsappUrl(
            ngo.whatsapp,
            buildAdoptionMessage(animal.name, animal.sex),
          )
        : null,
      ngo: {
        id: ngo.id,
        slug: ngo.slug,
        name: ngo.legalName,
        imageUrl: ngo.imageKey ? imageUrl(ngo.imageKey, NGO_THUMB) : null,
        city: ngo.city,
        uf: ngo.uf,
      },
    };
  },

  toMe(animal: AnimalWithImages): AnimalMeDto {
    return {
      ...base(animal),
      availableChangedAt: animal.availableChangedAt,
      createdAt: animal.createdAt,
    };
  },
};
