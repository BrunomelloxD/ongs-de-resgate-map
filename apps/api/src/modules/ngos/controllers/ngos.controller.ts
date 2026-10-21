import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '@/common/decorators/api-paginated-response.decorator.js';
import type { PaginatedResponseDto } from '@/common/dtos/response/paginated-response.dto.js';
import { ListNgoAnimalsDto } from '../dtos/request/list-ngo-animals.dto.js';
import { SearchNgosDto } from '../dtos/request/search-ngos.dto.js';
import { NgoAnimalDto } from '../dtos/response/ngo-animal-response.dto.js';
import { NgoSearchResponseDto } from '../dtos/response/ngo-pin-response.dto.js';
import { NgoPublicDto } from '../dtos/response/ngo-public-response.dto.js';
import { NgosService } from '../services/ngos.service.js';

/** PERF-03: public NGO responses stay 60 s in the CDN. */
const PUBLIC_CACHE = 'public, s-maxage=60';

@ApiTags('Ngos')
@Controller('ngos')
export class NgosController {
  constructor(private readonly ngos: NgosService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary:
      'Até 200 ONGs ativas da bbox, as mais próximas do centro primeiro (MAP-18)',
  })
  @ApiOkResponse({ type: NgoSearchResponseDto })
  @ApiBadRequestResponse({ description: 'bbox ou species inválidos' })
  search(
    @Query() { bbox, species }: SearchNgosDto,
  ): Promise<NgoSearchResponseDto> {
    return this.ngos.search(bbox, species ?? []);
  }

  @Get(':slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Página pública de uma ONG ativa (NGO-01)' })
  @ApiParam({ name: 'slug', example: 'patas-do-bairro' })
  @ApiOkResponse({ type: NgoPublicDto })
  @ApiNotFoundResponse({ description: 'Slug inexistente ou ONG inativa' })
  getBySlug(@Param('slug') slug: string): Promise<NgoPublicDto> {
    return this.ngos.getBySlug(slug);
  }

  @Get(':slug/animals')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Animais da ONG, 12 por página (NGO-05 a NGO-10)',
  })
  @ApiParam({ name: 'slug', example: 'patas-do-bairro' })
  @ApiPaginatedResponse(NgoAnimalDto)
  @ApiBadRequestResponse({ description: 'Filtro ou página inválidos' })
  @ApiNotFoundResponse({ description: 'Slug inexistente ou ONG inativa' })
  listAnimals(
    @Param('slug') slug: string,
    @Query() { page, species, sex, size, available }: ListNgoAnimalsDto,
  ): Promise<PaginatedResponseDto<NgoAnimalDto>> {
    return this.ngos.listAnimals(slug, { species, sex, size, available }, page);
  }
}
