import { ServiceUnavailableException } from '@nestjs/common';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import type { MediaService } from '@/modules/media/services/media.service.js';
import type {
  DemoAccountNgo,
  IDemoAccountRepository,
  Point,
} from '../../repositories/demo-account.repository.interface.js';
import {
  DemoAccountService,
  distanceKm,
  FALLBACK_MAP_START,
} from '../demo-account.service.js';

const ACCOUNT = { email: 'demo@animalhelper.example', password: 'Demo1234' };
const NGO: DemoAccountNgo = {
  id: 'ngo-demo',
  lat: -23.5651,
  lng: -46.6519,
  city: 'São Paulo',
  uf: 'SP',
};

/** A point `km` kilometres north of the NGO. */
const north = (km: number): Point => ({
  lat: NGO.lat + km / 111.195,
  lng: NGO.lng,
});

interface Options {
  account?: typeof ACCOUNT | null;
  ngo?: DemoAccountNgo | null;
  points?: Point[];
  bucketFails?: boolean;
}

function setup(options: Options = {}) {
  const calls: string[] = [];
  const accounts = {
    findByEmail: vi
      .fn()
      .mockResolvedValue(options.ngo === undefined ? NGO : options.ngo),
    findActivePoints: vi.fn().mockResolvedValue(options.points ?? [NGO]),
    deleteAnimals: vi.fn(() => {
      calls.push('animals');
      return Promise.resolve(4);
    }),
  };
  const media = {
    deleteNgoImages: vi.fn(() => {
      calls.push('bucket');
      return options.bucketFails
        ? Promise.reject(new ServiceUnavailableException())
        : Promise.resolve({ count: 8, bytes: 1200 });
    }),
  };
  const config = {
    demoAccount: options.account === undefined ? ACCOUNT : options.account,
  } as AppConfigService;
  const service = new DemoAccountService(
    config,
    accounts as unknown as IDemoAccountRepository,
    media as unknown as MediaService,
  );
  return { service, accounts, media, calls };
}

describe('distanceKm', () => {
  it('mede ~1 km para 0,009° de latitude', () => {
    expect(distanceKm(NGO, north(1))).toBeCloseTo(1, 2);
  });
});

describe('DemoAccountService.mapStart (DEP-22)', () => {
  it('com a demo aberta devolve null', async () => {
    const { service, accounts } = setup({ account: null });

    expect(await service.mapStart()).toBeNull();
    expect(accounts.findByEmail).not.toHaveBeenCalled();
  });

  it('sem a conta demo no banco abre em São Paulo (DEP-59)', async () => {
    const { service } = setup({ ngo: null });

    expect(await service.mapStart()).toEqual(FALLBACK_MAP_START);
    expect(FALLBACK_MAP_START).toEqual({
      lat: -23.5505,
      lng: -46.6333,
      radiusKm: 10,
    });
  });

  it('centraliza na ONG demo e busca as ONGs ativas da mesma cidade', async () => {
    const { service, accounts } = setup();

    const start = await service.mapStart();

    expect(start).toMatchObject({ lat: NGO.lat, lng: NGO.lng });
    expect(accounts.findByEmail).toHaveBeenCalledWith(ACCOUNT.email);
    expect(accounts.findActivePoints).toHaveBeenCalledWith('São Paulo', 'SP');
  });

  it.each([
    [[] as number[], 5],
    [[4.9], 5],
    [[3, 5.1], 10],
    [[9.9], 10],
    [[10.1], 25],
    [[24], 25],
    [[40], 25],
  ])(
    'ONGs a %j km → raio de %i km (menor que enquadra todas, teto 25)',
    async (distances, radiusKm) => {
      const { service } = setup({ points: [NGO, ...distances.map(north)] });

      expect((await service.mapStart())?.radiusKm).toBe(radiusKm);
    },
  );
});

describe('DemoAccountService.reset (DEP-28 a DEP-31)', () => {
  it('apaga as fotos no bucket antes dos animais e devolve os totais', async () => {
    const { service, accounts, media, calls } = setup();

    expect(await service.reset()).toEqual({
      animals: 4,
      objects: 8,
      bytes: 1200,
    });
    expect(media.deleteNgoImages).toHaveBeenCalledWith('ngo-demo');
    expect(accounts.deleteAnimals).toHaveBeenCalledWith('ngo-demo');
    expect(calls).toEqual(['bucket', 'animals']);
  });

  it('bucket fora: lança e mantém os animais para a próxima execução (DEP-31)', async () => {
    const { service, accounts } = setup({ bucketFails: true });

    await expect(service.reset()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(accounts.deleteAnimals).not.toHaveBeenCalled();
  });

  it('com a demo aberta não apaga nada', async () => {
    const { service, media, accounts } = setup({ account: null });

    expect(await service.reset()).toBeNull();
    expect(media.deleteNgoImages).not.toHaveBeenCalled();
    expect(accounts.deleteAnimals).not.toHaveBeenCalled();
  });

  it('sem a conta demo no banco não apaga nada', async () => {
    const { service, media } = setup({ ngo: null });

    expect(await service.reset()).toBeNull();
    expect(media.deleteNgoImages).not.toHaveBeenCalled();
  });
});
