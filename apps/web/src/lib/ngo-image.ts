/** SIGN-09/10: the NGO image takes JPG, PNG or WebP (no HEIC, unlike animal photos). */
export const NGO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MB = 1024 * 1024;

/** Type and size of the NGO image; "passa de N MB" means strictly over N × 1024². */
export function isAcceptedNgoImage(
  file: { type: string; size: number },
  maxUploadMb: number,
): boolean {
  return NGO_IMAGE_TYPES.includes(file.type) && file.size <= maxUploadMb * MB;
}
