'use server';

import { refresh } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { getAuthedApi } from '@/lib/session';
import type { ToggleResult } from '../dashboard.types';

const inputSchema = z.object({ id: z.uuid(), available: z.boolean() });

/** DASH-02: saves right away. Any failure is `{ ok: false }`, so the switch reverts (DASH-03). */
export async function toggleAvailability(
  id: string,
  available: boolean,
): Promise<ToggleResult> {
  // Public POST endpoint: validate here too.
  const input = inputSchema.safeParse({ id, available });
  if (!input.success) return { ok: false };

  try {
    const api = await getAuthedApi();
    const { response } = await api.PATCH(
      '/api/v1/me/animals/{id}/availability',
      {
        params: { path: { id: input.data.id } },
        body: { available: input.data.available },
      },
    );
    if (!response.ok) return { ok: false };
  } catch (error) {
    // Keeps getAuthedApi's redirect to /session/end (AUTH-07).
    unstable_rethrow(error);
    return { ok: false };
  }

  refresh();
  return { ok: true };
}
