import type { DemoInfo, PhotoCredit } from './demo.types';

export function makeDemoInfo(overrides: Partial<DemoInfo> = {}): DemoInfo {
  return {
    enabled: true,
    retentionDays: 7,
    quotas: {
      maxNgos: 30,
      signupsPerIpPerDay: 2,
      maxAnimalsPerNgo: 10,
      maxImagesPerAnimal: 3,
      maxUploadMb: 5,
      maxStorageMb: 500,
    },
    locked: false,
    account: null,
    mapStart: null,
    ...overrides,
  };
}

/** The locked demo (AD-008): shared account and the map's first frame. */
export function makeLockedDemoInfo(
  overrides: Partial<DemoInfo> = {},
): DemoInfo {
  return makeDemoInfo({
    locked: true,
    account: { email: 'demo@animalhelper.example', password: 'Demo1234' },
    mapStart: { lat: -23.5614, lng: -46.6559, radiusKm: 25 },
    ...overrides,
  });
}

export function makePhotoCredit(
  overrides: Partial<PhotoCredit> = {},
): PhotoCredit {
  return {
    title: '01 puppy portrait Kim 8 weeks',
    creator: 'Marilyn Peddle',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    page: 'https://commons.wikimedia.org/wiki/File:01_puppy_portrait_Kim_8_weeks.jpg',
    ...overrides,
  };
}
