import type { DemoInfo } from './animal-form.types';
import { MAX_PHOTOS } from './schemas/animal.schema';

/** AFORM-07: 8 photos, or DEMO_MAX_IMAGES_PER_ANIMAL with the demo on. */
export function photoLimit(demo: Pick<DemoInfo, 'enabled' | 'quotas'>): number {
  return demo.enabled ? demo.quotas.maxImagesPerAnimal : MAX_PHOTOS;
}
