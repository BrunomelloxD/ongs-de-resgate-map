import type { Schemas } from '@repo/api-client';

export type MyNgo = Schemas['NgoMeDto'];
export type MyAnimal = Schemas['AnimalMeDto'];

/** Result of the availability toggle (DASH-02, DASH-03). */
export interface ToggleResult {
  ok: boolean;
}

export type ToggleAvailability = (
  id: string,
  available: boolean,
) => Promise<ToggleResult>;
