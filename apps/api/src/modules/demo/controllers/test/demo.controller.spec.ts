import { Test } from '@nestjs/testing';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { DemoController } from '../demo.controller.js';

const QUOTAS = {
  maxNgos: 30,
  signupsPerIpPerDay: 2,
  maxAnimalsPerNgo: 10,
  maxImagesPerAnimal: 3,
  maxUploadMb: 5,
  maxStorageMb: 500,
};

async function controllerWith(demo: object) {
  const module = await Test.createTestingModule({
    controllers: [DemoController],
    providers: [{ provide: AppConfigService, useValue: { demo } }],
  }).compile();
  return module.get(DemoController);
}

describe('DemoController', () => {
  it('com a demo ligada, devolve a retenção e as 6 cotas (DEMO-01, DEMO-02)', async () => {
    const controller = await controllerWith({
      enabled: true,
      retentionDays: 7,
      ...QUOTAS,
    });

    expect(controller.get()).toEqual({
      enabled: true,
      retentionDays: 7,
      quotas: QUOTAS,
    });
  });

  it('com a demo desligada, devolve enabled: false (DEMO-20)', async () => {
    const controller = await controllerWith({
      enabled: false,
      retentionDays: 7,
      ...QUOTAS,
      maxImagesPerAnimal: 8,
      maxUploadMb: 10,
    });

    expect(controller.get()).toEqual({
      enabled: false,
      retentionDays: 7,
      quotas: { ...QUOTAS, maxImagesPerAnimal: 8, maxUploadMb: 10 },
    });
  });
});
