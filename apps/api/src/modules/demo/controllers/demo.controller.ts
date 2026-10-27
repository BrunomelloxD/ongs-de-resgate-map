import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { DemoConfigResponseDto } from '../dtos/response/demo-config-response.dto.js';
import { DemoAccountService } from '../services/demo-account.service.js';

@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly config: AppConfigService,
    private readonly demoAccount: DemoAccountService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Modo demo: retenção, cotas e demo fechada (banner, /sobre-a-demo, /entrar, /mapa)',
  })
  @ApiOkResponse({ type: DemoConfigResponseDto })
  async get(): Promise<DemoConfigResponseDto> {
    const { enabled, retentionDays, ...quotas } = this.config.demo;
    return {
      enabled,
      retentionDays,
      quotas,
      locked: this.config.demoLocked,
      account: this.config.demoAccount,
      mapStart: await this.demoAccount.mapStart(),
    };
  }
}
