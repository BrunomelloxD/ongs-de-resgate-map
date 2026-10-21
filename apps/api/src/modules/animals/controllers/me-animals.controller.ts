import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentNgo } from '@/modules/sessions/decorators/current-ngo.decorator.js';
import { SessionGuard } from '@/modules/sessions/guards/session.guard.js';
import type { SessionContext } from '@/modules/sessions/services/sessions.service.js';
import {
  CreateAnimalDto,
  ListMyAnimalsDto,
  SetAvailabilityDto,
  UpdateAnimalDto,
} from '../dtos/request/animal.dto.js';
import { AnimalMeDto } from '../dtos/response/animal-response.dto.js';
import { AnimalsService } from '../services/animals.service.js';

const NOT_FOUND = 'Animal inexistente ou de outra ONG (SEC-06)';

/** The NGO always comes from the session token, never from the body (SEC-05). */
@ApiTags('Me')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sem sessão válida' })
@UseGuards(SessionGuard)
@Controller('me/animals')
export class MeAnimalsController {
  constructor(private readonly animals: AnimalsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Animais da própria ONG, com busca e filtro (DASH-01, DASH-04, DASH-05)',
  })
  @ApiOkResponse({ type: [AnimalMeDto] })
  @ApiBadRequestResponse({ description: 'Filtro inválido' })
  list(
    @CurrentNgo() { ngoId }: SessionContext,
    @Query() { search, filter }: ListMyAnimalsDto,
  ): Promise<AnimalMeDto[]> {
    return this.animals.listMine(ngoId, search, filter);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra o animal com as fotos já enviadas (AFORM-01 a AFORM-05)',
  })
  @ApiCreatedResponse({ type: AnimalMeDto })
  @ApiBadRequestResponse({
    description: 'Campo inválido ou sem fotos ("Adicione pelo menos 1 foto.")',
  })
  @ApiNotFoundResponse({ description: 'Foto inexistente ou de outra ONG' })
  @ApiConflictResponse({
    description: 'Limite de animais (DEMO-09) ou de fotos (DEMO-10) da demo',
  })
  create(
    @CurrentNgo() { ngoId }: SessionContext,
    @Body() dto: CreateAnimalDto,
  ): Promise<AnimalMeDto> {
    return this.animals.create(ngoId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Edita o animal; `imageIds` troca a lista de fotos (AFORM-13, AFORM-14)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AnimalMeDto })
  @ApiBadRequestResponse({ description: 'Campo inválido' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: 'Limite de fotos da demo (DEMO-10)' })
  @ApiServiceUnavailableResponse({
    description: 'Bucket fora ao apagar fotos removidas; nada mudou',
  })
  update(
    @CurrentNgo() { ngoId }: SessionContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnimalDto,
  ): Promise<AnimalMeDto> {
    return this.animals.update(ngoId, id, dto);
  }

  @Patch(':id/availability')
  @ApiOperation({
    summary: 'Liga ou desliga "Disponível para adoção" (DASH-02)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AnimalMeDto })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  setAvailability(
    @CurrentNgo() { ngoId }: SessionContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { available }: SetAvailabilityDto,
  ): Promise<AnimalMeDto> {
    return this.animals.setAvailability(ngoId, id, available);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exclui o animal e as fotos dele do bucket (AFORM-16, AFORM-17)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Animal excluído' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiServiceUnavailableResponse({
    description: 'Bucket fora; nada foi apagado',
  })
  delete(
    @CurrentNgo() { ngoId }: SessionContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.animals.delete(ngoId, id);
  }
}
