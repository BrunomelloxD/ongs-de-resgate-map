import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CepParamsDto } from '../dtos/request/cep-params.dto.js';
import { GeocodeAddressDto } from '../dtos/request/geocode-address.dto.js';
import { SearchCitiesDto } from '../dtos/request/search-cities.dto.js';
import { CepAddressResponseDto } from '../dtos/response/cep-address-response.dto.js';
import { CityResponseDto } from '../dtos/response/city-response.dto.js';
import { GeocodeResponseDto } from '../dtos/response/geocode-response.dto.js';
import { GeoService } from '../services/geo.service.js';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('cities')
  @ApiOperation({ summary: 'Até 5 municípios do IBGE pelo nome (LOC-07)' })
  @ApiOkResponse({ type: CityResponseDto, isArray: true })
  @ApiBadRequestResponse({
    description: 'q ausente ou com mais de 100 caracteres',
  })
  searchCities(@Query() { q }: SearchCitiesDto): CityResponseDto[] {
    return this.geo.searchCities(q);
  }

  @Get('cep/:cep')
  @ApiOperation({
    summary: 'Endereço e coordenada de um CEP (LOC-09, SIGN-17)',
  })
  @ApiOkResponse({ type: CepAddressResponseDto })
  @ApiBadRequestResponse({ description: 'CEP sem 8 dígitos' })
  @ApiNotFoundResponse({ description: 'CEP inexistente (LOC-10)' })
  @ApiServiceUnavailableResponse({
    description: 'Provedores de CEP fora ou acima de 5 s (LOC-11, SIGN-18)',
  })
  lookupCep(@Param() { cep }: CepParamsDto): Promise<CepAddressResponseDto> {
    return this.geo.lookupCep(cep);
  }

  @Post('geocode')
  @HttpCode(200)
  @ApiOperation({ summary: 'Coordenada de um endereço (SIGN-19, SIGN-20)' })
  @ApiOkResponse({ type: GeocodeResponseDto })
  @ApiBadRequestResponse({
    description: 'address vazio ou acima de 300 caracteres',
  })
  async geocode(
    @Body() { address }: GeocodeAddressDto,
  ): Promise<GeocodeResponseDto> {
    const point = await this.geo.geocode(address);
    return {
      found: point !== null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
    };
  }
}
