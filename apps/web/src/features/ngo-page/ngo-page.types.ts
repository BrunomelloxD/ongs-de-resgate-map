import type { Schemas } from '@repo/api-client';

export type NgoPublic = Schemas['NgoPublicDto'];
export type DayHours = Schemas['DayHoursDto'];
export type NgoAnimal = Schemas['NgoAnimalDto'];
export type Species = Schemas['Species'];
export type Sex = Schemas['Sex'];
export type Size = Schemas['Size'];

/** One value per filter (NGO-06); `available` is "Só disponíveis" (NGO-05). */
export interface NgoAnimalFilters {
  species?: Species;
  sex?: Sex;
  size?: Size;
  available: boolean;
}

export interface NgoAnimalPage {
  data: NgoAnimal[];
  meta: Schemas['PaginationMetaDto'];
}
