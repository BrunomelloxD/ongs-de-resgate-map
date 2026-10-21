import { z } from 'zod';
import { animalFormDictionary } from '../animal-form.dictionary';
import type {
  AnimalField,
  AnimalFormValues,
  FieldErrors,
} from '../animal-form.types';

const t = animalFormDictionary.validation;

/** AFORM-06: pre-filled, editable and optional. */
export const DEFAULT_BREED = 'SRD (vira-lata)';

/** AFORM-07 with the demo off; the api's limit too. */
export const MAX_PHOTOS = 8;

/** Optional text: trimmed, and empty becomes null, as the api takes it. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

/** AFORM-01 to AFORM-06. Used by the form and again by the `saveAnimal` action. */
export const animalSchema = z.object({
  name: z.string().trim().min(1, t.name).max(60, t.name),
  species: z.enum(['DOG', 'CAT', 'OTHER'], t.species),
  sex: z.enum(['MALE', 'FEMALE'], t.sex),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE'], t.size),
  // Text from the input: "" must not become 0.
  ageValue: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, t.ageValue)
    .transform(Number)
    .pipe(z.number().max(30, t.ageValue)),
  ageUnit: z.enum(['MONTHS', 'YEARS'], t.ageUnit),
  breed: optionalText(60, t.breed),
  description: optionalText(1000, t.description),
  imageIds: z.array(z.uuid()).min(1, t.photos).max(MAX_PHOTOS),
});

export type AnimalPayload = z.output<typeof animalSchema>;

export type AnimalValidation =
  { ok: true; data: AnimalPayload } | { ok: false; errors: FieldErrors };

/** The first message of each field; `imageIds` shows on the photos. */
export function validateAnimal(values: AnimalFormValues): AnimalValidation {
  const parsed = animalSchema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    // A body that isn't an object has no field to point at.
    if (typeof key !== 'string') continue;
    const field = (key === 'imageIds' ? 'photos' : key) as AnimalField;
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
