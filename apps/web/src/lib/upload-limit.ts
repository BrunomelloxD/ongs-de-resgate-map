// No `server-only` here: next.config.ts imports this file.

/** Used when MAX_UPLOAD_MB is missing at build time: 10 MB api limit (DEMO_MODE=false). */
const DEFAULT_MAX_UPLOAD_MB = 10;

/**
 * Server Actions body limit: the file limit + 1 MB of multipart overhead (AFORM-08).
 * Read from MAX_UPLOAD_MB at build time; an invalid value falls back to the default.
 */
export function serverActionsBodySizeLimit(
  maxUploadMb: string | undefined,
): `${number}mb` {
  const parsed = Number(maxUploadMb);
  const mb =
    Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_MB;

  return `${mb + 1}mb`;
}
