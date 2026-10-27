import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { getClientIp } from '@/common/http/client-ip.js';
import { RetryAfterFilter } from '@/common/rate-limit/retry-after.filter.js';
import { CurrentNgo } from '@/modules/sessions/decorators/current-ngo.decorator.js';
import { SessionGuard } from '@/modules/sessions/guards/session.guard.js';
import type { SessionContext } from '@/modules/sessions/services/sessions.service.js';
import {
  ChangePasswordDto,
  LoginDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from '../dtos/request/auth.dto.js';
import { SessionResponseDto } from '../dtos/response/session-response.dto.js';
import { AuthService } from '../services/auth.service.js';
import { PasswordService } from '../services/password.service.js';
import { BlockedWhenDemoLocked } from '@/common/guards/demo-locked.guard.js';

const RETRY_AFTER = {
  'Retry-After': {
    description: 'Segundos até a janela liberar',
    schema: { type: 'integer' },
  },
};

@ApiTags('Auth')
// 429s carry Retry-After (AUTH-04, AUTH-11).
@UseFilters(RetryAfterFilter)
@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwords: PasswordService,
  ) {}

  @Post('auth/sessions')
  @ApiOperation({ summary: 'Entra com e-mail e senha (AUTH-02 a AUTH-04)' })
  @ApiCreatedResponse({ type: SessionResponseDto })
  @ApiBadRequestResponse({ description: 'E-mail ou senha ausentes' })
  @ApiUnauthorizedResponse({ description: 'E-mail ou senha incorretos.' })
  @ApiTooManyRequestsResponse({
    description: 'Muitas tentativas. Tente de novo em 15 minutos.',
    headers: RETRY_AFTER,
  })
  login(
    @Body() { email, password }: LoginDto,
    @Req() req: Request,
  ): Promise<SessionResponseDto> {
    return this.auth.login(email, password, getClientIp(req));
  }

  @Delete('auth/sessions/current')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sai e revoga o token (AUTH-05)' })
  @ApiNoContentResponse({ description: 'Sessão revogada' })
  @ApiUnauthorizedResponse({ description: 'Sem sessão válida' })
  logout(@CurrentNgo() { sessionId }: SessionContext): Promise<void> {
    return this.auth.logout(sessionId);
  }

  @Post('auth/password-resets')
  @BlockedWhenDemoLocked()
  @HttpCode(202)
  @ApiOperation({
    summary: 'Pede o link de recuperação; sempre 202 (AUTH-08, AUTH-09)',
  })
  @ApiAcceptedResponse({
    description: 'Se houver uma conta com este e-mail, o link foi enviado',
  })
  @ApiBadRequestResponse({ description: 'E-mail inválido' })
  @ApiTooManyRequestsResponse({
    description: 'Muitos pedidos. Tente de novo em 1 hora.',
    headers: RETRY_AFTER,
  })
  requestReset(
    @Body() { email }: RequestPasswordResetDto,
    @Req() req: Request,
  ): Promise<void> {
    return this.passwords.requestReset(email, getClientIp(req));
  }

  @Post('auth/password-resets/:token')
  @BlockedWhenDemoLocked()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Troca a senha pelo link e revoga as sessões (AUTH-12, AUTH-13)',
  })
  @ApiParam({ name: 'token', description: 'Token do link do e-mail' })
  @ApiNoContentResponse({ description: 'Senha alterada' })
  @ApiBadRequestResponse({ description: 'Senha fora das regras (SIGN-15)' })
  @ApiGoneResponse({ description: 'Este link expirou ou já foi usado.' })
  resetWithToken(
    @Param('token') token: string,
    @Body() { password }: ResetPasswordDto,
  ): Promise<void> {
    return this.passwords.resetWithToken(token, password);
  }

  @Put('me/password')
  @BlockedWhenDemoLocked()
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Troca a senha e revoga as outras sessões (PROF-05, PROF-06)',
  })
  @ApiNoContentResponse({ description: 'Senha alterada' })
  @ApiBadRequestResponse({ description: 'Senha nova fora das regras' })
  @ApiUnauthorizedResponse({ description: 'Sem sessão válida' })
  @ApiForbiddenResponse({ description: 'Senha atual incorreta.' })
  changePassword(
    @CurrentNgo() { ngoId, sessionId }: SessionContext,
    @Body() { currentPassword, password }: ChangePasswordDto,
  ): Promise<void> {
    return this.passwords.changePassword(
      ngoId,
      sessionId,
      currentPassword,
      password,
    );
  }
}
