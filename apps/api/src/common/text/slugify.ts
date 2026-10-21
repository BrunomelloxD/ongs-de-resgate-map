const FALLBACK = 'ong';

/** URL slug of a name; the caller adds the -2, -3… suffix on collisions (SIGN-29). */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || FALLBACK;
}
