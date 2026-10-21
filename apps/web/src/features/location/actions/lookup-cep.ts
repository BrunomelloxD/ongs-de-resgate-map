'use server';

import { headers } from 'next/headers';
import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';
import { normalizeCep } from '@/lib/masks';
import { locationDictionary } from '../location.dictionary';
import type { LookupCepResult } from '../location.types';

const t = locationDictionary.cep;

/**
 * GET /geo/cep/:cep (LOC-09 to LOC-11, SIGN-17, SIGN-18). Shared by the
 * location picker, the signup and the profile through `client.ts`.
 */
export async function lookupCep(cep: string): Promise<LookupCepResult> {
  const digits = normalizeCep(String(cep));
  if (digits.length !== 8) return { ok: false, error: t.invalid };

  const { data, response } = await getApi({
    clientIp: getClientIp(await headers()),
  }).GET('/api/v1/geo/cep/{cep}', { params: { path: { cep: digits } } });

  if (data) return { ok: true, address: data };
  if (response.status === 404) return { ok: false, error: t.notFound };

  // 503 (providers down or over 5 s) and anything unexpected.
  return { ok: false, error: t.unavailable };
}
