'use server';

import { getEnv } from '@/lib/env';
import { isAcceptedNgoImage } from '@/lib/ngo-image';
import { getAuthedApi } from '@/lib/session';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type { UploadNgoImageResult } from '../ngo-account.types';

const t = ngoAccountDictionary.image;

/**
 * PUT /me/ngo/image (SIGN-09, SIGN-10, DEMO-11, DEMO-12), used by the signup and the
 * profile. Public POST endpoint: checks the file here too; the api crops it square.
 */
export async function uploadNgoImage(
  formData: FormData,
): Promise<UploadNgoImageResult> {
  const maxMb = getEnv().MAX_UPLOAD_MB;
  const file = formData.get('file');
  if (!(file instanceof File) || !isAcceptedNgoImage(file, maxMb)) {
    return { ok: false, error: t.invalid(maxMb) };
  }

  const body = new FormData();
  body.set('file', file);
  const api = await getAuthedApi();
  const { data, response } = await api.PUT('/api/v1/me/ngo/image', {
    // openapi-fetch sends FormData as is, with the multipart boundary.
    body: body as unknown as { file: string },
  });

  if (data) return { ok: true, imageUrl: data.imageUrl };
  // 413 is DEMO-11 on the api; the field shows the full rule of SIGN-10.
  if (response.status === 400 || response.status === 413) {
    return { ok: false, error: t.invalid(maxMb) };
  }
  if (response.status === 409) return { ok: false, error: t.storageFull };
  return { ok: false, error: t.unavailable };
}
