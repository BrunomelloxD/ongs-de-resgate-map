/** AFORM-08: animal photos take HEIC too; the api converts it. */
export const ANIMAL_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/** For the file picker: browsers without HEIC support only match by extension. */
export const ANIMAL_PHOTO_ACCEPT = [
  ...ANIMAL_PHOTO_TYPES,
  '.heic',
  '.heif',
].join(',');

const MB = 1024 * 1024;
const HEIC_NAME = /\.hei[cf]$/i;

/** Type and size of an animal photo; "passa de N MB" means strictly over N × 1024². */
export function isAcceptedAnimalPhoto(
  file: { type: string; size: number; name: string },
  maxUploadMb: number,
): boolean {
  // Chrome sends HEIC with an empty type; the api checks the content anyway.
  const typeOk =
    ANIMAL_PHOTO_TYPES.includes(file.type) ||
    (file.type === '' && HEIC_NAME.test(file.name));

  return typeOk && file.size > 0 && file.size <= maxUploadMb * MB;
}
