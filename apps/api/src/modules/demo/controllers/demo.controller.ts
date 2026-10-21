import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { DemoConfigResponseDto } from '../dtos/response/demo-config-response.dto.js';

@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  constructor(private readonly config: AppConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Modo demo: retenção e cotas atuais (banner e /sobre-a-demo)',
  })
  @ApiOkResponse({ type: DemoConfigResponseDto })
  get(): DemoConfigResponseDto {
    const { enabled, retentionDays, ...quotas } = this.config.demo;
    return { enabled, retentionDays, quotas };
  }
}
