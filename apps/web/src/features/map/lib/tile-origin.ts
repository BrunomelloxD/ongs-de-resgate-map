/** The origin of a Leaflet tile template, for `preconnect`; `{s}` becomes Leaflet's first subdomain. */
export function tileOrigin(tileUrl: string): string {
  return new URL(tileUrl.replace('{s}', 'a')).origin;
}
