import {
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentNgo } from '@/modules/sessions/decorators/current-ngo.decorator.js';
import { SessionGuard } from '@/modules/sessions/guards/session.guard.js';
import type { SessionContext } from '@/modules/sessions/services/sessions.service.js';
import { VARIANT_CONTENT_TYPE } from '../adapters/sharp-image-processor.js';
import { UploadedImageResponseDto } from '../dtos/response/uploaded-image-response.dto.js';
import { UploadTooLargeFilter } from '../filters/upload-too-large.filter.js';
import { MediaService, type UploadedImage } from '../services/media.service.js';

@ApiTags('Media')
@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('me/images')
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  // Multer limits come from MulterModule (media.module.ts); the file stays in memory.
  @UseInterceptors(FileInterceptor('file'))
  @UseFilters(UploadTooLargeFilter)
  @ApiOperation({
    summary:
      'Envia uma foto de animal, que fica pendente até salvar o animal (AFORM-08, AFORM-12)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadedImageResponseDto })
  @ApiBadRequestResponse({
    description: 'Sem arquivo ou tipo diferente de JPG, PNG, WebP e HEIC',
  })
  @ApiUnauthorizedResponse({ description: 'Sem sessão válida' })
  @ApiConflictResponse({ description: 'Armazenamento da demo cheio (DEMO-12)' })
  @ApiPayloadTooLargeResponse({
    description: 'Arquivo acima do limite (DEMO-11)',
  })
  upload(
    @CurrentNgo() { ngoId }: SessionContext,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<UploadedImageResponseDto> {
    return this.media.uploadAnimalImage(ngoId, file);
  }

  @Get('media/*key')
  // A page loads many images at once; the per-visitor limit would cut them.
  @SkipThrottle()
  @ApiOperation({
    summary:
      'Variante WebP de uma foto salva ou da imagem de uma ONG ativa (PERF-02)',
  })
  @ApiParam({
    name: 'key',
    type: String,
    example: 'ngos/{ngoId}/images/{id}-1200.webp',
  })
  @ApiOkResponse({
    content: {
      [VARIANT_CONTENT_TYPE]: { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiNotFoundResponse({
    description: 'Chave inválida, foto pendente ou ONG inativa ou inexistente',
  })
  async read(@Param('key') key: string[]): Promise<StreamableFile> {
    const stream = await this.media.getPublicImage(key.join('/'));
    return new StreamableFile(stream, { type: VARIANT_CONTENT_TYPE });
  }
}
