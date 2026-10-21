import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import {
  CepNotFound,
  CepUnavailable,
  type CepAddress,
  type ICepProvider,
} from '../../adapters/cep-provider.js';
import type { IGeocoder } from '../../adapters/nominatim-geocoder.js';
import { CitySearchService } from '../city-search.service.js';
import { GeoService } from '../geo.service.js';

const PAULISTA: CepAddress = {
  street: 'Avenida Paulista',
  district: 'Bela Vista',
  city: 'São Paulo',
  uf: 'SP',
};
// Center of São Paulo/SP in municipalities.json.
const SAO_PAULO_CENTER = { lat: -23.5329, lng: -46.6395 };

function setup(lookup: () => Promise<CepAddress>) {
  const cepProvider = { lookup: vi.fn(lookup) };
  const geocoder = { geocode: vi.fn().mockResolvedValue(null) };
  const service = new GeoService(
    new CitySearchService(),
    cepProvider as unknown as ICepProvider,
    geocoder as unknown as IGeocoder,
  );
  return { cepProvider, geocoder, service };
}

describe('GeoService', () => {
  describe('searchCities', () => {
    it('devolve os municípios do IBGE (LOC-07)', () => {
      const { service } = setup(() => Promise.resolve(PAULISTA));

      expect(service.searchCities('sao paulo')).toContainEqual({
        id: 3550308,
        name: 'São Paulo',
        uf: 'SP',
        ...SAO_PAULO_CENTER,
      });
    });
  });

  describe('lookupCep', () => {
    it('CEP com coordenada devolve o endereço e o ponto do CEP (LOC-09, SIGN-17)', async () => {
      const { service, geocoder, cepProvider } = setup(() =>
        Promise.resolve({ ...PAULISTA, lat: -23.5613, lng: -46.6565 }),
      );

      expect(await service.lookupCep('01310100')).toEqual({
        ...PAULISTA,
        lat: -23.5613,
        lng: -46.6565,
      });
      expect(cepProvider.lookup).toHaveBeenCalledWith('01310100');
      expect(geocoder.geocode).not.toHaveBeenCalled();
    });

    it('CEP sem coordenada geocodifica o logradouro e a cidade', async () => {
      const { service, geocoder } = setup(() => Promise.resolve(PAULISTA));
      geocoder.geocode.mockResolvedValue({ lat: -23.56, lng: -46.65 });

      expect(await service.lookupCep('01310100')).toEqual({
        ...PAULISTA,
        lat: -23.56,
        lng: -46.65,
      });
      expect(geocoder.geocode).toHaveBeenCalledWith(
        'Avenida Paulista, São Paulo - SP',
      );
    });

    it('se a geocodificação falha, usa o centro do município (SIGN-20)', async () => {
      const { service } = setup(() => Promise.resolve(PAULISTA));

      expect(await service.lookupCep('01310100')).toEqual({
        ...PAULISTA,
        ...SAO_PAULO_CENTER,
      });
    });

    it('CEP geral do município (sem logradouro) usa o centro sem geocodificar', async () => {
      const { service, geocoder } = setup(() =>
        Promise.resolve({
          street: '',
          district: '',
          city: 'Bom Jesus',
          uf: 'RS',
        }),
      );

      expect(await service.lookupCep('95290000')).toEqual({
        street: '',
        district: '',
        city: 'Bom Jesus',
        uf: 'RS',
        lat: -28.6697,
        lng: -50.4295,
      });
      expect(geocoder.geocode).not.toHaveBeenCalled();
    });

    it('cidade fora da lista do IBGE e sem geocodificação devolve lat/lng null', async () => {
      const { service } = setup(() =>
        Promise.resolve({ ...PAULISTA, city: 'Cidade Inexistente' }),
      );

      expect(await service.lookupCep('01310100')).toMatchObject({
        lat: null,
        lng: null,
      });
    });

    it('CEP inexistente → 404 com a mensagem do LOC-10', async () => {
      const { service } = setup(() => Promise.reject(new CepNotFound()));

      const error = await service
        .lookupCep('00000000')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getStatus()).toBe(404);
      expect((error as NotFoundException).message).toBe(
        'CEP não encontrado. Confira os números ou busque pela cidade.',
      );
    });

    it('provedores fora ou acima de 5 s → 503 com a mensagem do LOC-11', async () => {
      const { service } = setup(() => Promise.reject(new CepUnavailable()));

      const error = await service
        .lookupCep('01310100')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getStatus()).toBe(503);
      expect((error as ServiceUnavailableException).message).toBe(
        'Não conseguimos buscar o CEP agora. Tente pela cidade.',
      );
    });

    it('erro inesperado do provedor propaga sem virar 404 nem 503', async () => {
      const boom = new TypeError('bug');
      const { service } = setup(() => Promise.reject(boom));

      await expect(service.lookupCep('01310100')).rejects.toBe(boom);
    });
  });

  describe('geocode', () => {
    it('devolve a coordenada do endereço (SIGN-19) ou null (SIGN-20)', async () => {
      const { service, geocoder } = setup(() => Promise.resolve(PAULISTA));
      geocoder.geocode
        .mockResolvedValueOnce({ lat: -23.56, lng: -46.65 })
        .mockResolvedValueOnce(null);

      expect(await service.geocode('Av. Paulista, 1000')).toEqual({
        lat: -23.56,
        lng: -46.65,
      });
      expect(await service.geocode('Rua que não existe')).toBeNull();
      expect(geocoder.geocode).toHaveBeenNthCalledWith(1, 'Av. Paulista, 1000');
    });
  });
});
