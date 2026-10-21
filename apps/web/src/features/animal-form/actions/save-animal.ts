'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { getAuthedApi } from '@/lib/session';
import { animalFormDictionary } from '../animal-form.dictionary';
import type {
  AnimalField,
  AnimalFormValues,
  FieldErrors,
  SaveAnimalError,
} from '../animal-form.types';
import { DASHBOARD_PATH } from '../paths';
import { validateAnimal } from '../schemas/animal.schema';

const t = animalFormDictionary;

const FIELDS: Record<string, AnimalField> = {
  name: 'name',
  species: 'species',
  sex: 'sex',
  size: 'size',
  ageValue: 'ageValue',
  ageUnit: 'ageUnit',
  breed: 'breed',
  description: 'description',
  imageIds: 'photos',
};

const fieldMessage = (field: AnimalField, apiMessage: string) => {
  if (field !== 'photos') return t.validation[field];
  return apiMessage === t.validation.photos
    ? t.validation.photos
    : t.save.photosInvalid;
};

// SPEC_DEVIATION: the design expects a 400 with `errors[]`; the api answers Nest's
// default `message: string[]`, each one starting with the property name.
function fieldErrorsOf(message: unknown): FieldErrors {
  const messages = Array.isArray(message) ? message : [message];
  const errors: FieldErrors = {};
  for (const text of messages) {
    if (typeof text !== 'string') continue;
    const field =
      text === t.validation.photos ? 'photos' : FIELDS[text.split(' ')[0]!];
    if (field) errors[field] ??= fieldMessage(field, text);
  }
  return errors;
}

/**
 * POST /me/animals (id null) or PATCH /me/animals/:id with `imageIds` in the final
 * order (AFORM-01, AFORM-10, AFORM-11, AFORM-13, AFORM-14, DEMO-09, DEMO-10).
 * Success redirects to /painel. Public POST endpoint: validates here too.
 */
export async function saveAnimal(
  id: string | null,
  values: AnimalFormValues,
): Promise<SaveAnimalError> {
  if (id !== null && !z.uuid().safeParse(id).success) {
    return { ok: false, error: t.save.failed, fieldErrors: {} };
  }
  const input = validateAnimal(values);
  if (!input.ok) {
    const empty = Object.keys(input.errors).length === 0;
    return {
      ok: false,
      error: empty ? t.save.invalid : undefined,
      fieldErrors: input.errors,
    };
  }

  try {
    const api = await getAuthedApi();
    const { data, error, response } = id
      ? await api.PATCH('/api/v1/me/animals/{id}', {
          params: { path: { id } },
          body: input.data,
        })
      : await api.POST('/api/v1/me/animals', { body: input.data });

    if (data) redirect(DASHBOARD_PATH);

    // An empty error body comes as '' or undefined; Object() turns both into an object.
    const { message }: { message?: unknown } = Object(error);
    if (response.status === 400) {
      const fieldErrors = fieldErrorsOf(message);
      const empty = Object.keys(fieldErrors).length === 0;
      return {
        ok: false,
        error: empty ? t.save.invalid : undefined,
        fieldErrors,
      };
    }
    // DEMO-09/DEMO-10 quotas, or "Animal não encontrado." / "Foto não encontrada.".
    if (
      (response.status === 409 || response.status === 404) &&
      typeof message === 'string'
    ) {
      return { ok: false, error: message, fieldErrors: {} };
    }
  } catch (caught) {
    // Keeps the redirects: /painel on success, /session/end on a 401 (AUTH-07).
    unstable_rethrow(caught);
  }
  return { ok: false, error: t.save.failed, fieldErrors: {} };
}
