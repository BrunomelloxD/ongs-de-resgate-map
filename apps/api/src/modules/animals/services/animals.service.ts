import { Injectable, NotFoundException } from '@nestjs/common';
import { DemoQuotaService } from '@/modules/demo/services/demo-quota.service.js';
import { MediaService } from '@/modules/media/services/media.service.js';
import type {
  AnimalMeDto,
  AnimalPublicDto,
} from '../dtos/response/animal-response.dto.js';
import { AnimalMapper } from '../mappers/animal.mapper.js';
import {
  type AnimalData,
  type AnimalFilter,
  type AnimalWithImages,
  IAnimalsRepository,
  type Tx,
} from '../repositories/animals.repository.interface.js';

// SPEC_DEVIATION: ANI-06 and SEC-06 give the status (404) but no text.
// Reason: the web shows its own 404 page; this is the api's message.
export const ANIMAL_NOT_FOUND = 'Animal não encontrado.';

export interface AnimalInput extends AnimalData {
  /** Full, ordered photo list; the first is the cover. */
  imageIds: string[];
}

export type AnimalUpdate = Partial<AnimalInput>;

@Injectable()
export class AnimalsService {
  constructor(
    private readonly animals: IAnimalsRepository,
    private readonly media: MediaService,
    private readonly quota: DemoQuotaService,
  ) {}

  /** ANI-06: missing, of another slug or of an inactive NGO look the same. */
  async getPublic(id: string, slug: string): Promise<AnimalPublicDto> {
    const animal = await this.animals.findPublicById(id);
    if (!animal || animal.ngo.slug !== slug || animal.ngo.status !== 'ACTIVE') {
      throw new NotFoundException(ANIMAL_NOT_FOUND);
    }
    return AnimalMapper.toPublic(animal);
  }

  /** DASH-01, DASH-04, DASH-05: only the NGO of the session. */
  async listMine(
    ngoId: string,
    search: string | undefined,
    filter: AnimalFilter,
  ): Promise<AnimalMeDto[]> {
    const animals = await this.animals.findAllOfNgo(ngoId, {
      search: search?.trim() || undefined,
      filter,
    });
    return animals.map((animal) => AnimalMapper.toMe(animal));
  }

  /**
   * AFORM-01: born available, with its photos. The count runs after the
   * quota:animals lock, in the same transaction (AD-004, DEMO-09, DEMO-13).
   */
  async create(ngoId: string, input: AnimalInput): Promise<AnimalMeDto> {
    const { imageIds, ...data } = input;
    const animal = await this.animals.transaction(async (tx) => {
      await this.quota.assertCanAddAnimal(tx, ngoId);
      const { id } = await this.animals.create(tx, {
        ...data,
        ngoId,
        available: true,
      });
      await this.media.attachToAnimal(tx, ngoId, id, imageIds);
      return this.findOwn(tx, ngoId, id);
    });
    return AnimalMapper.toMe(animal);
  }

  /** AFORM-13, AFORM-14: removed photos leave the database and the bucket. */
  async update(
    ngoId: string,
    id: string,
    input: AnimalUpdate,
  ): Promise<AnimalMeDto> {
    const { imageIds, ...data } = input;
    const animal = await this.animals.transaction(async (tx) => {
      await this.findOwn(tx, ngoId, id);
      await this.animals.update(tx, ngoId, id, data);
      if (imageIds) {
        await this.media.attachToAnimal(tx, ngoId, id, imageIds);
      }
      return this.findOwn(tx, ngoId, id);
    });
    return AnimalMapper.toMe(animal);
  }

  /** DASH-02: the change time is recorded only when the value changes. */
  async setAvailability(
    ngoId: string,
    id: string,
    available: boolean,
  ): Promise<AnimalMeDto> {
    const animal = await this.animals.transaction(async (tx) => {
      const current = await this.findOwn(tx, ngoId, id);
      if (current.available === available) {
        return current;
      }
      const changes = { available, availableChangedAt: new Date() };
      await this.animals.update(tx, ngoId, id, changes);
      return { ...current, ...changes };
    });
    return AnimalMapper.toMe(animal);
  }

  /**
   * AFORM-16: the photos (rows and bucket) go before the animal. A bucket
   * failure is a 503 that rolls the whole transaction back.
   */
  async delete(ngoId: string, id: string): Promise<void> {
    await this.animals.transaction(async (tx) => {
      await this.findOwn(tx, ngoId, id);
      await this.media.deleteImages(tx, ngoId, id);
      await this.animals.delete(tx, ngoId, id);
    });
  }

  /** SEC-06: another NGO's animal is "not found". */
  private async findOwn(
    tx: Tx,
    ngoId: string,
    id: string,
  ): Promise<AnimalWithImages> {
    const animal = await this.animals.findOwn(tx, ngoId, id);
    if (!animal) {
      throw new NotFoundException(ANIMAL_NOT_FOUND);
    }
    return animal;
  }
}
