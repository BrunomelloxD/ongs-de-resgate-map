import { Test } from '@nestjs/testing';
import type { Mocked } from 'vitest';
import { GeoService } from '../../services/geo.service.js';
import { GeoController } from '../geo.controller.js';

const SAO_PAULO = {
  id: 3550308,
  name: 'São Paulo',
  uf: 'SP',
  lat: -23.5329,
  lng: -46.6395,
};

describe('GeoController', () => {
  let controller: GeoController;
  let geo: Mocked<GeoService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GeoController],
      providers: [
        {
          provide: GeoService,
          useValue: {
            searchCities: vi.fn(),
            lookupCep: vi.fn(),
            geocode: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(GeoController);
    geo = module.get(GeoService);
  });

  it('searchCities repassa q e devolve os municípios', () => {
    geo.searchCities.mockReturnValue([SAO_PAULO]);

    expect(controller.searchCities({ q: 'sao paulo' })).toEqual([SAO_PAULO]);
    expect(geo.searchCities).toHaveBeenCalledWith('sao paulo');
  });

  it('lookupCep repassa o CEP e devolve o endereço', async () => {
    const address = {
      street: 'Avenida Paulista',
      district: 'Bela Vista',
      city: 'São Paulo',
      uf: 'SP',
      lat: -23.5613,
      lng: -46.6565,
    };
    geo.lookupCep.mockResolvedValue(address);

    expect(await controller.lookupCep({ cep: '01310100' })).toEqual(address);
    expect(geo.lookupCep).toHaveBeenCalledWith('01310100');
  });

  it('geocode achado devolve found: true com a coordenada (SIGN-19)', async () => {
    geo.geocode.mockResolvedValue({ lat: -23.56, lng: -46.65 });

    expect(await controller.geocode({ address: 'Av. Paulista, 1000' })).toEqual(
      {
        found: true,
        lat: -23.56,
        lng: -46.65,
      },
    );
    expect(geo.geocode).toHaveBeenCalledWith('Av. Paulista, 1000');
  });

  it('geocode não achado devolve found: false sem coordenada (SIGN-20)', async () => {
    geo.geocode.mockResolvedValue(null);

    expect(await controller.geocode({ address: 'Rua X' })).toEqual({
      found: false,
      lat: null,
      lng: null,
    });
  });
});
