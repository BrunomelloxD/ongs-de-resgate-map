import { getApi } from '@/lib/api';
import { getClientIp } from '@/lib/client-ip';

const MIN_QUERY = 3;

/** BFF for the city autocomplete (LOC-07). The IBGE list barely changes: one day at the CDN. */
export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < MIN_QUERY) {
    return Response.json(
      { message: 'Digite 3 ou mais caracteres.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { data, response } = await getApi({
    clientIp: getClientIp(request.headers),
  }).GET('/api/v1/geo/cities', { params: { query: { q } } });

  if (!data) {
    return new Response(null, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return Response.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=86400' },
  });
}
