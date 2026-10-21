import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Put,
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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UploadTooLargeFilter } from '@/modules/media/filters/upload-too-large.filter.js';
import type { UploadedImage } from '@/modules/media/services/media.service.js';
import { CurrentNgo } from '@/modules/sessions/decorators/current-ngo.decorator.js';
import { SessionGuard } from '@/modules/sessions/guards/session.guard.js';
import type { SessionContext } from '@/modules/sessions/services/sessions.service.js';
import { DeleteAccountDto } from '../dtos/request/delete-account.dto.js';
import { UpdateNgoDto } from '../dtos/request/update-ngo.dto.js';
import { NgoMeDto } from '../dtos/response/ngo-me-response.dto.js';
import { NgosService } from '../services/ngos.service.js';

/** The NGO always comes from the session token, never from the body (SEC-05). */
@ApiTags('Me')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sem sessão válida' })
@UseGuards(SessionGuard)
@Controller('me/ngo')
export class MeNgoController {
  constructor(private readonly ngos: NgosService) {}

  @Get()
  @ApiOperation({ summary: 'Dados da própria ONG (PROF-01)' })
  @ApiOkResponse({ type: NgoMeDto })
  getMe(@CurrentNgo() { ngoId }: SessionContext): Promise<NgoMeDto> {
    return this.ngos.getMe(ngoId);
  }

  @Patch()
  @ApiOperation({
    summary: 'Edita o perfil, sem o CNPJ (PROF-02 a PROF-04, DEMO-05)',
  })
  @ApiOkResponse({ type: NgoMeDto })
  @ApiBadRequestResponse({
    description:
      'Campo inválido, CNPJ no corpo ou endereço sem nova confirmação do pino',
  })
  @ApiConflictResponse({ description: 'E-mail de outra ONG, com `field`' })
  updateMe(
    @CurrentNgo() { ngoId }: SessionContext,
    @Body() dto: UpdateNgoDto,
  ): Promise<NgoMeDto> {
    return this.ngos.updateMe(ngoId, dto);
  }

  @Put('image')
  // Multer limits come from MulterModule (ngos.module.ts); the file stays in memory.
  @UseInterceptors(FileInterceptor('file'))
  @UseFilters(UploadTooLargeFilter)
  @ApiOperation({ summary: 'Troca a imagem da ONG (SIGN-09, SIGN-10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: NgoMeDto })
  @ApiBadRequestResponse({
    description: 'Sem arquivo ou tipo diferente de JPG, PNG e WebP',
  })
  @ApiConflictResponse({ description: 'Armazenamento da demo cheio (DEMO-12)' })
  @ApiPayloadTooLargeResponse({
    description: 'Arquivo acima do limite (DEMO-11)',
  })
  updateImage(
    @CurrentNgo() { ngoId }: SessionContext,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<NgoMeDto> {
    return this.ngos.updateImage(ngoId, file);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exclui a conta, os dados e as imagens (PROF-07, PROF-08)',
  })
  @ApiNoContentResponse({ description: 'Conta excluída' })
  @ApiForbiddenResponse({ description: 'Senha atual incorreta.' })
  @ApiServiceUnavailableResponse({
    description: 'Bucket fora; nada foi apagado',
  })
  deleteAccount(
    @CurrentNgo() { ngoId }: SessionContext,
    @Body() { password }: DeleteAccountDto,
  ): Promise<void> {
    return this.ngos.deleteAccount(ngoId, password);
  }
}
