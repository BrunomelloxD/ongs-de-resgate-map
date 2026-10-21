import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PublicAnimalQueryDto } from '../dtos/request/animal.dto.js';
import { AnimalPublicDto } from '../dtos/response/animal-response.dto.js';
import { AnimalsService } from '../services/animals.service.js';

@ApiTags('Animals')
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animals: AnimalsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe público do animal (ANI-01 a ANI-06)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AnimalPublicDto })
  @ApiNotFoundResponse({
    description:
      'Animal inexistente, excluído, de outro slug ou de ONG inativa (ANI-06)',
  })
  getPublic(
    // A malformed id is just a missing animal (ANI-06).
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
    )
    id: string,
    @Query() { slug }: PublicAnimalQueryDto,
  ): Promise<AnimalPublicDto> {
    return this.animals.getPublic(id, slug);
  }
}
