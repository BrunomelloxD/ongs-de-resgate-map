import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CepAddress,
  CepNotFound,
  CepUnavailable,
  ICepProvider,
} from '../adapters/cep-provider.js';
import { Coordinates, IGeocoder } from '../adapters/nominatim-geocoder.js';
import { City, CitySearchService } from './city-search.service.js';

export type CepLookup = Omit<CepAddress, 'lat' | 'lng'> & {
  lat: number | null;
  lng: number | null;
};

@Injectable()
export class GeoService {
  constructor(
    private readonly cities: CitySearchService,
    private readonly cepProvider: ICepProvider,
    private readonly geocoder: IGeocoder,
  ) {}

  searchCities(q: string): City[] {
    return this.cities.search(q);
  }

  /** Without coordinates: geocode street and city, then the municipality center. */
  async lookupCep(cep: string): Promise<CepLookup> {
    const address = await this.findCep(cep);
    if (address.lat !== undefined && address.lng !== undefined) {
      return { ...address, lat: address.lat, lng: address.lng };
    }
    const point =
      (address.street
        ? await this.geocoder.geocode(
            `${address.street}, ${address.city} - ${address.uf}`,
          )
        : null) ?? this.cities.findByName(address.city, address.uf);
    return { ...address, lat: point?.lat ?? null, lng: point?.lng ?? null };
  }

  /** null when the address is not found or the provider fails (SIGN-20). */
  geocode(address: string): Promise<Coordinates | null> {
    return this.geocoder.geocode(address);
  }

  private async findCep(cep: string): Promise<CepAddress> {
    try {
      return await this.cepProvider.lookup(cep);
    } catch (error) {
      if (error instanceof CepNotFound) {
        throw new NotFoundException(
          'CEP não encontrado. Confira os números ou busque pela cidade.',
        );
      }
      if (error instanceof CepUnavailable) {
        throw new ServiceUnavailableException(
          'Não conseguimos buscar o CEP agora. Tente pela cidade.',
        );
      }
      throw error;
    }
  }
}
