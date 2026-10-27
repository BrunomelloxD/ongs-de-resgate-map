import { Test } from '@nestjs/testing';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { DemoAccountService } from '../../services/demo-account.service.js';
import { DemoController } from '../demo.controller.js';

const QUOTAS = {
  maxNgos: 30,
  signupsPerIpPerDay: 2,
  maxAnimalsPerNgo: 10,
  maxImagesPerAnimal: 3,
  maxUploadMb: 5,
  maxStorageMb: 500,
};
const ACCOUNT = { email: 'demo@animalhelper.example', password: 'Demo1234' };
const START = { lat: -23.5651, lng: -46.6519, radiusKm: 25 };

async function controllerWith(
  demo: object,
  locked: { demoLocked: boolean; demoAccount: object | null } = {
    demoLocked: false,
    demoAccount: null,
  },
  mapStart: object | null = null,
) {
  const module = await Test.createTestingModule({
    controllers: [DemoController],
    providers: [
      { provide: AppConfigService, useValue: { demo, ...locked } },
      {
        provide: DemoAccountService,
        useValue: { mapStart: vi.fn().mockResolvedValue(mapStart) },
      },
    ],
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

    expect(await controller.get()).toEqual({
      enabled: true,
      retentionDays: 7,
      quotas: QUOTAS,
      locked: false,
      account: null,
      mapStart: null,
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

    expect(await controller.get()).toEqual({
      enabled: false,
      retentionDays: 7,
      quotas: { ...QUOTAS, maxImagesPerAnimal: 8, maxUploadMb: 10 },
      locked: false,
      account: null,
      mapStart: null,
    });
  });

  it('com a demo fechada, devolve locked, as credenciais e o início do mapa (DEP-18, DEP-22)', async () => {
    const controller = await controllerWith(
      { enabled: true, retentionDays: 7, ...QUOTAS },
      { demoLocked: true, demoAccount: ACCOUNT },
      START,
    );

    expect(await controller.get()).toEqual({
      enabled: true,
      retentionDays: 7,
      quotas: QUOTAS,
      locked: true,
      account: ACCOUNT,
      mapStart: START,
    });
  });
});
