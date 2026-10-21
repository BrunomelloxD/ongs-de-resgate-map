import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  /** Server-to-server only; never exposed to the browser. */
  API_URL: z.url(),
  /** Shared secret sent to the api as `X-Internal-Token` (AD-002). */
  INTERNAL_API_TOKEN: z.string().min(32),
  /** Public address of this app, used in absolute links (share, canonical). */
  PUBLIC_WEB_URL: z.url(),
  /** Tile template, e.g. https://tile.openstreetmap.org/{z}/{x}/{y}.png (MAP-01). */
  TILE_URL: z.url(),
  /** Attribution shown on the map, e.g. "© OpenStreetMap contributors" (MAP-01). */
  TILE_ATTRIBUTION: z.string().min(1),
  /** Upload limit in MB; must match the api (AFORM-08). */
  MAX_UPLOAD_MB: z.coerce.number().int().positive(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Read lazily so `next build` doesn't require the variables.
 * The error lists the names and reasons, never the values (SEC-08).
 */
export function getEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente inválidas:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
