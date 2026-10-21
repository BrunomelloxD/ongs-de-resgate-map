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
    ...overrides,
  };
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
