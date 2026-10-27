import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { hashIp } from '@/common/crypto/ip-hash.js';
import { getClientIp } from '@/common/http/client-ip.js';
import {
  CheckCnpjDto,
  CheckEmailDto,
} from '../dtos/request/check-availability.dto.js';
import { SignupNgoDto } from '../dtos/request/signup-ngo.dto.js';
import {
  AvailabilityResponseDto,
  SignupResponseDto,
} from '../dtos/response/signup-response.dto.js';
import { NgosService } from '../services/ngos.service.js';
import { BlockedWhenDemoLocked } from '@/common/guards/demo-locked.guard.js';

/** The checks reveal whether a CNPJ or e-mail has an account: 20/min per IP. */
const VALIDATION_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@ApiTags('Ngos')
@Controller('ngos')
export class NgoSignupController {
  constructor(
    private readonly ngos: NgosService,
    private readonly config: AppConfigService,
  ) {}

  @Post()
  @BlockedWhenDemoLocked()
  @ApiOperation({
    summary: 'Cadastra a ONG e abre a sessão (SIGN-28 a SIGN-32)',
  })
  @ApiCreatedResponse({ type: SignupResponseDto })
  @ApiBadRequestResponse({ description: 'Campo inválido (ex.: SIGN-04)' })
  @ApiConflictResponse({
    description:
      'CNPJ ou e-mail já cadastrado, com `field` (SIGN-31), ou limite de ONGs da demo (DEMO-07)',
  })
  @ApiTooManyRequestsResponse({
    description: 'Limite de cadastros por rede (DEMO-08)',
  })
  signup(
    @Body() { termsAccepted: _accepted, ...input }: SignupNgoDto,
    @Req() req: Request,
  ): Promise<SignupResponseDto> {
    const ipHash = hashIp(getClientIp(req), this.config.ipHashSecret);
    return this.ngos.signup(input, ipHash);
  }

  @Post('validations/cnpj')
  @HttpCode(200)
  @Throttle(VALIDATION_THROTTLE)
  @ApiOperation({ summary: 'O CNPJ ainda não tem cadastro? (SIGN-05)' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  @ApiBadRequestResponse({ description: 'CNPJ inválido (SIGN-04)' })
  @ApiTooManyRequestsResponse({ description: 'Mais de 20 por minuto' })
  async checkCnpj(
    @Body() { cnpj }: CheckCnpjDto,
  ): Promise<AvailabilityResponseDto> {
    return { available: await this.ngos.isCnpjAvailable(cnpj) };
  }

  @Post('validations/email')
  @HttpCode(200)
  @Throttle(VALIDATION_THROTTLE)
  @ApiOperation({ summary: 'O e-mail ainda não tem cadastro? (SIGN-12)' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  @ApiBadRequestResponse({ description: 'E-mail inválido' })
  @ApiTooManyRequestsResponse({ description: 'Mais de 20 por minuto' })
  async checkEmail(
    @Body() { email }: CheckEmailDto,
  ): Promise<AvailabilityResponseDto> {
    return { available: await this.ngos.isEmailAvailable(email) };
  }
}
