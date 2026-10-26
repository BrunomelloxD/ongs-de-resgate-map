import { Injectable } from '@nestjs/common';
import decodeHeic from 'heic-decode';
import sharp, { type Sharp } from 'sharp';

/** Animal photo: 160, 600 and 1200 px wide. NGO image: square, 160 and 600 px. */
export type ImageProfile = 'animal' | 'ngo';

export interface ImageVariant {
  /** Nominal size, used in the object key (`-160.webp`). */
  size: number;
  body: Buffer;
  width: number;
  height: number;
}

export const VARIANT_CONTENT_TYPE = 'image/webp';

/** Not an accepted image type, unreadable, or above the pixel limit. */
export class UnsupportedImage extends Error {
  constructor(reason: string) {
    super(`Unsupported image: ${reason}`);
    this.name = 'UnsupportedImage';
  }
}

/** Abstract class (not an interface) so it works as a DI token. */
export abstract class IImageProcessor {
  abstract process(
    buffer: Buffer,
    profile: ImageProfile,
  ): Promise<ImageVariant[]>;
}

// A 12 MP photo needs ~50 MB decoded (~190 MB peak for HEIC); 40 MP caps the worst case.
const MAX_PIXELS = 40_000_000;
const WEBP_QUALITY = 80;

export const PROFILES = {
  // AFORM-08 and AFORM-12. 600 px for the cards (T174, PERF-02); the largest stays last.
  animal: {
    formats: ['jpeg', 'png', 'webp', 'heic'],
    sizes: [160, 600, 1200],
  },
  // SIGN-09 and SIGN-10: no HEIC for the NGO image.
  ngo: { formats: ['jpeg', 'png', 'webp'], sizes: [160, 600] },
} as const satisfies Record<
  ImageProfile,
  { formats: readonly string[]; sizes: readonly number[] }
>;

// SPEC_DEVIATION: design.md declares process(buffer, { square?: boolean }).
// Reason: the NGO image also rejects HEIC (SIGN-10), so the profile sets both the shape and the accepted types.
@Injectable()
export class SharpImageProcessor extends IImageProcessor {
  // Serializes conversions: one decoded image in memory at a time.
  private queue: Promise<unknown> = Promise.resolve();

  constructor() {
    super();
    sharp.concurrency(1);
  }

  process(buffer: Buffer, profile: ImageProfile): Promise<ImageVariant[]> {
    const run = () => this.convert(buffer, profile);
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async convert(
    buffer: Buffer,
    profile: ImageProfile,
  ): Promise<ImageVariant[]> {
    const { formats, sizes } = PROFILES[profile];
    const { format, width, height } = await this.detect(buffer);

    if (!(formats as readonly string[]).includes(format)) {
      throw new UnsupportedImage(format);
    }
    if (width * height > MAX_PIXELS) {
      throw new UnsupportedImage(`${width}x${height} exceeds ${MAX_PIXELS} px`);
    }

    const source =
      format === 'heic' ? await fromHeic(buffer) : fromFile(buffer);
    // rotate() applies the EXIF orientation; without withMetadata() no EXIF is copied.
    const upright = await source
      .rotate()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return Promise.all(
      sizes.map(async (size) => {
        const { data, info } = await sharp(upright.data, {
          raw: upright.info,
        })
          .resize(
            profile === 'ngo'
              ? { width: size, height: size, fit: 'cover' }
              : { width: size, withoutEnlargement: true },
          )
          .webp({ quality: WEBP_QUALITY })
          .toBuffer({ resolveWithObject: true });
        return { size, body: data, width: info.width, height: info.height };
      }),
    );
  }

  /** Type from the content, never from the file name or the client's MIME type. */
  private async detect(
    buffer: Buffer,
  ): Promise<{ format: string; width: number; height: number }> {
    try {
      const meta = await sharp(buffer).metadata();
      // HEIF covers both HEIC (HEVC) and AVIF (AV1); only HEIC is accepted.
      const format =
        meta.format === 'heif'
          ? meta.compression === 'hevc'
            ? 'heic'
            : 'avif'
          : meta.format;
      return { format, width: meta.width, height: meta.height };
    } catch {
      throw new UnsupportedImage('unreadable');
    }
  }
}

function fromFile(buffer: Buffer): Sharp {
  return sharp(buffer, { limitInputPixels: MAX_PIXELS });
}

// The bundled libvips reads HEIF only as AVIF, so HEIC goes through libheif (WASM).
async function fromHeic(buffer: Buffer): Promise<Sharp> {
  const { width, height, data } = await decodeHeic({ buffer });
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
    raw: { width, height, channels: 4 },
    limitInputPixels: MAX_PIXELS,
  });
}
