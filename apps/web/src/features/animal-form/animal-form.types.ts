import type { Schemas } from '@repo/api-client';

export type Species = Schemas['Species'];
export type Sex = Schemas['Sex'];
export type Size = Schemas['Size'];
export type AgeUnit = Schemas['AgeUnit'];
export type MyAnimal = Schemas['AnimalMeDto'];
export type DemoInfo = Schemas['DemoConfigResponseDto'];

/** The form as typed: the age stays text until the schema reads it. */
export interface AnimalFormValues {
  name: string;
  species: Species | '';
  sex: Sex | '';
  size: Size | '';
  ageValue: string;
  ageUnit: AgeUnit | '';
  breed: string;
  description: string;
  /** Uploaded photos in the final order; the first is the cover (AFORM-10, AFORM-11). */
  imageIds: string[];
}

export type AnimalField =
  Exclude<keyof AnimalFormValues, 'imageIds'> | 'photos';

export type FieldErrors = Partial<Record<AnimalField, string>>;

/** `uploadPhoto` (POST /me/images): one call per file (AFORM-09). */
export type UploadPhotoResult =
  { ok: true; id: string; thumbUrl: string } | { ok: false; error: string };

export type UploadPhoto = (formData: FormData) => Promise<UploadPhotoResult>;

/** One photo of the form, from the pick until its upload ends (AFORM-09). */
export interface Photo {
  /** Local key: stays the same through retries and moves. */
  key: string;
  status: 'uploading' | 'done' | 'error';
  /** Api id once uploaded; goes in `imageIds`. */
  id?: string;
  /** Object URL of the picked file, or the 160 px variant of a saved photo. */
  previewUrl: string;
  /** Alt of a saved photo (A11Y-11). */
  alt?: string;
  /** Kept for "Tentar de novo". */
  file?: File;
  error?: string;
}

/** `saveAnimal` only returns on failure: success redirects to /painel. */
export interface SaveAnimalError {
  ok: false;
  /** Error for the whole form (quota, not found, api down). */
  error?: string;
  fieldErrors: FieldErrors;
}

export type SaveAnimal = (
  id: string | null,
  values: AnimalFormValues,
) => Promise<SaveAnimalError>;

/** `deleteAnimal` only returns on failure: success redirects to /painel. */
export interface DeleteAnimalError {
  ok: false;
  error: string;
}

export type DeleteAnimal = (id: string) => Promise<DeleteAnimalError>;

/** `toggleAvailability` of the dashboard, given by the app (a feature doesn't import another). */
export type SetAvailability = (
  id: string,
  available: boolean,
) => Promise<{ ok: boolean }>;
