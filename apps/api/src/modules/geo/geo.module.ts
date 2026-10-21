import { Module } from '@nestjs/common';
import { HttpCepProvider, ICepProvider } from './adapters/cep-provider.js';
import { IGeocoder, NominatimGeocoder } from './adapters/nominatim-geocoder.js';
import { GeoController } from './controllers/geo.controller.js';
import { CitySearchService } from './services/city-search.service.js';
import { GeoService } from './services/geo.service.js';

@Module({
  controllers: [GeoController],
  providers: [
    GeoService,
    CitySearchService,
    { provide: ICepProvider, useClass: HttpCepProvider },
    { provide: IGeocoder, useClass: NominatimGeocoder },
  ],
})
export class GeoModule {}
