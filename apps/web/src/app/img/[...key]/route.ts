import { getApi } from '@/lib/api';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
// Same format the api accepts in GET /media/*key.
const PUBLIC_KEY = new RegExp(
  `^ngos/${UUID}/(images|logo)/${UUID}-\\d+\\.webp$`,
);

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Image proxy (AD-001). Keys never change (a new upload gets a new id), so the
 * answer is immutable for a day; deleted images 404 at the origin right away.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const key = (await params).key.join('/');
  if (!PUBLIC_KEY.test(key)) {
    return new Response(null, { status: 404, headers: NO_STORE });
  }

  const { data, response } = await getApi().GET('/api/v1/media/{key}', {
    params: { path: { key } },
    // The key holds slashes; the regex already limits it to safe characters.
    pathSerializer: (pathname) => pathname.replace('{key}', key),
    parseAs: 'stream',
  });

  if (!data) {
    return new Response(null, {
      status: response.status === 404 ? 404 : 502,
      headers: NO_STORE,
    });
  }

  return new Response(data, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
