import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { S3ObjectStorage } from '../../src/modules/media/adapters/s3-object-storage.js';
import {
  type ImageProfile,
  SharpImageProcessor,
} from '../../src/modules/media/adapters/sharp-image-processor.js';
import type { AppConfigService } from '../../src/common/config/app-config.service.js';

const ASSETS = join(import.meta.dirname, 'assets');

// The seed bucket is deliberately NOT read from S3_*: apps/api/.env may point to the
// hosted bucket, and a local `make seeder` must never write there. The defaults are the
// dev MinIO from docker-compose.yml. To seed a hosted bucket, set the SEED_S3_* variables.
function seedBucket() {
  const env = process.env;
  return {
    endpoint: env['SEED_S3_ENDPOINT'] ?? 'http://localhost:9000',
    region: env['SEED_S3_REGION'] ?? 'us-east-1',
    bucket: env['SEED_S3_BUCKET'] ?? 'animal-helper-dev',
    accessKeyId: env['SEED_S3_ACCESS_KEY_ID'] ?? 'minioadmin',
    secretAccessKey: env['SEED_S3_SECRET_ACCESS_KEY'] ?? 'minioadmin',
    forcePathStyle: (env['SEED_S3_FORCE_PATH_STYLE'] ?? 'true') === 'true',
  };
}

const storage = new S3ObjectStorage({
  s3: seedBucket(),
} as unknown as AppConfigService);
const processor = new SharpImageProcessor();

export interface UploadedSeedImage {
  bytes: number;
  width: number;
  height: number;
}

/**
 * Converts a photo of `prisma/seeds/assets/` and writes its variants under
 * `{keyPrefix}-{size}.webp`. The key never changes, so a second run overwrites
 * the same objects instead of adding new ones.
 */
export async function uploadSeedImage(
  file: string,
  keyPrefix: string,
  profile: ImageProfile,
): Promise<UploadedSeedImage> {
  const variants = await processor.process(
    await readFile(join(ASSETS, file)),
    profile,
  );
  for (const { size, body } of variants) {
    await storage.put(`${keyPrefix}-${size}.webp`, body, 'image/webp');
  }
  return {
    bytes: variants.reduce((sum, { body }) => sum + body.length, 0),
    // The largest variant, like the upload of the api.
    width: variants.at(-1)!.width,
    height: variants.at(-1)!.height,
  };
}
