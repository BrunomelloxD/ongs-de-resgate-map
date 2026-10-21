import { photoLimit } from './photo-limit';

const quotas = {
  maxNgos: 30,
  signupsPerIpPerDay: 2,
  maxAnimalsPerNgo: 10,
  maxImagesPerAnimal: 3,
  maxUploadMb: 5,
  maxStorageMb: 500,
};

describe('photoLimit', () => {
  it('AFORM-07: com a demo ligada vale DEMO_MAX_IMAGES_PER_ANIMAL', () => {
    expect(photoLimit({ enabled: true, quotas })).toBe(3);
  });

  it('AFORM-07/DEMO-20: com a demo desligada vale 8', () => {
    expect(photoLimit({ enabled: false, quotas })).toBe(8);
  });
});
