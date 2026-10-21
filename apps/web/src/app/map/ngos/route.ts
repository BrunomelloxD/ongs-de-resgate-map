import { z } from 'zod';
import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';

// At most 2 decimals (~1 km): the browser already rounds outward (SEC-01).
const COORD = String.raw`-?\d{1,3}(\.\d{1,2})?`;

const querySchema = z.object({
  bbox: z.string().regex(new RegExp(`^${COORD}(,${COORD}){3}$`)),
  species: z
    .string()
    .regex(/^(DOG|CAT)(,(DOG|CAT))?$/)
    .optional(),
});

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * BFF for the map search (MAP-18). Never logs the query: the bbox stays out of
 * the logs (SEC-02). Public answer, 60 s at the CDN (PERF-03).
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    bbox: params.get('bbox') ?? undefined,
    species: params.get('species') ?? undefined,
  });
  if (!parsed.success) {
    return new Response(null, { status: 400, headers: NO_STORE });
  }

  const { data, response } = await getApi({
    clientIp: getClientIp(request.headers),
  }).GET('/api/v1/ngos', { params: { query: parsed.data } });

  if (!data) {
    return new Response(null, { status: response.status, headers: NO_STORE });
  }

  return Response.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60' },
  });
}
