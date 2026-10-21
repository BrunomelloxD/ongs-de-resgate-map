'use server';

import { unstable_rethrow } from 'next/navigation';
import { getEnv } from '@/lib/env';
import { getAuthedApi } from '@/lib/session';
import { animalFormDictionary } from '../animal-form.dictionary';
import type { UploadPhotoResult } from '../animal-form.types';
import { isAcceptedAnimalPhoto } from '../photo-file';

const t = animalFormDictionary.upload;

/**
 * POST /me/images, one file per call (AD-001, AFORM-08, AFORM-09, DEMO-10 to DEMO-12).
 * Public POST endpoint: checks the file here too; the api converts it to WebP.
 */
export async function uploadPhoto(
  formData: FormData,
): Promise<UploadPhotoResult> {
  const maxMb = getEnv().MAX_UPLOAD_MB;
  const file = formData.get('file');
  if (!(file instanceof File) || !isAcceptedAnimalPhoto(file, maxMb)) {
    return { ok: false, error: t.invalid(maxMb) };
  }

  const body = new FormData();
  body.set('file', file);
  try {
    const api = await getAuthedApi();
    const { data, error, response } = await api.POST('/api/v1/me/images', {
      // openapi-fetch sends FormData as is, with the multipart boundary.
      body: body as unknown as { file: string },
    });

    if (data) return { ok: true, id: data.id, thumbUrl: data.thumbUrl };
    if (response.status === 400) return { ok: false, error: t.invalid(maxMb) };
    if (response.status === 413) return { ok: false, error: t.tooLarge(maxMb) };
    if (response.status === 409) {
      // An empty error body comes as '' or undefined; Object() turns both into an object.
      const { message }: { message?: unknown } = Object(error);
      return {
        ok: false,
        error: typeof message === 'string' ? message : t.storageFull,
      };
    }
  } catch (caught) {
    // Keeps getAuthedApi's redirect to /session/end (AUTH-07).
    unstable_rethrow(caught);
  }
  return { ok: false, error: t.failed };
}
