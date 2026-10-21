import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';
import { setSessionCookie } from '@/lib/session';
import {
  aboutSchema,
  addressSchema,
  contactSchema,
  hoursSchema,
  makeReviewSchema,
} from '../schemas/signup.schema';
import { signupDictionary } from '../signup.dictionary';
import type { CreateAccountError, SignupStep } from '../signup.types';
import { slugOf } from '../steps';

const t = signupDictionary;

export const DASHBOARD_PATH = '/painel';

// The demo acceptance (DEMO-03) has no field in the api: the review step owns it.
const payloadSchema = z.object({
  signupRequestId: z.uuid(),
  about: aboutSchema,
  contact: contactSchema,
  address: addressSchema,
  hours: hoursSchema,
  review: makeReviewSchema({ demoMode: false }),
});

/** `uploadNgoImage` of `features/ngo-account`, given by the app (a feature doesn't import another). */
export type UploadImage = (formData: FormData) => Promise<unknown>;

/** The first step whose data doesn't pass; a bad request id stays on the review. */
function invalidStep(error: z.ZodError): CreateAccountError {
  const key = error.issues[0]!.path[0];
  const step = key === 'signupRequestId' ? null : slugOf(key as SignupStep);
  return { ok: false, step, error: t.create.invalid };
}

function readJson(value: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(typeof value === 'string' ? value : '');
  } catch {
    return null;
  }
}

/**
 * POST /ngos (SIGN-28, SIGN-31, SIGN-32, DEMO-07, DEMO-08). Not a Server Action by
 * itself: `app/cadastro` wraps it with the image upload. The form data carries the
 * wizard as JSON in `data` and the NGO image, kept in the browser, in `image`.
 */
export async function createAccount(
  formData: FormData,
  uploadImage: UploadImage,
): Promise<CreateAccountError> {
  const json = readJson(formData.get('data'));
  if (json === null || typeof json !== 'object') {
    return { ok: false, step: null, error: t.create.invalid };
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return invalidStep(parsed.error);

  const { signupRequestId, about, contact, address, hours } = parsed.data;
  const { confirmation: _confirmation, ...access } = contact;
  const { location, ...place } = address;

  const { data, error, response } = await getApi({
    clientIp: getClientIp(await headers()),
  }).POST('/api/v1/ngos', {
    body: {
      ...about,
      ...access,
      ...place,
      lat: location.lat,
      lng: location.lng,
      locationConfirmedAt: location.confirmedAt,
      openingHours: hours.openingHours,
      signupRequestId,
      termsAccepted: true,
    },
  });

  if (data) {
    await setSessionCookie(data.token);
    const image = formData.get('image');
    if (image instanceof File && image.size > 0) {
      const upload = new FormData();
      upload.set('file', image);
      // The NGO already exists: a failed image only leaves the dashboard checklist pending.
      await uploadImage(upload).catch(() => undefined);
    }
    redirect(DASHBOARD_PATH);
  }

  // An empty error body comes as '' or undefined; Object() turns both into an object.
  const body: { field?: unknown; message?: unknown } = Object(error);
  if (response.status === 409) {
    // SIGN-31: back to the step of the field, with its error.
    if (body.field === 'cnpj') {
      return {
        ok: false,
        step: 'sobre',
        field: 'cnpj',
        error: t.availability.cnpjTaken,
      };
    }
    if (body.field === 'email') {
      return {
        ok: false,
        step: 'contato',
        field: 'email',
        error: t.availability.emailTaken,
      };
    }
    // DEMO-07, or the same signupRequestId sent with another password.
    const message =
      typeof body.message === 'string' ? body.message : t.create.ngoQuota;
    return { ok: false, step: null, error: message };
  }
  // DEMO-08; the api's own throttle answers 429 too.
  if (response.status === 429)
    return { ok: false, step: null, error: t.create.ipQuota };
  if (response.status === 400)
    return { ok: false, step: null, error: t.create.invalid };
  return { ok: false, step: null, error: t.create.unavailable };
}
