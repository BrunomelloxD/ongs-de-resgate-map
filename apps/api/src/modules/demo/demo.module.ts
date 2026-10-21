import { Global, Module } from '@nestjs/common';
import { MediaModule } from '@/modules/media/media.module.js';
import { SessionsModule } from '@/modules/sessions/sessions.module.js';
import { DemoController } from './controllers/demo.controller.js';
import { CleanupRepository } from './repositories/cleanup.repository.js';
import { ICleanupRepository } from './repositories/cleanup.repository.interface.js';
import { CleanupService } from './services/cleanup.service.js';
import { DemoQuotaService } from './services/demo-quota.service.js';

// Global so media can use the quotas: the cleanup makes this module import media.
@Global()
@Module({
  imports: [MediaModule, SessionsModule],
  controllers: [DemoController],
  providers: [
    DemoQuotaService,
    CleanupService,
    { provide: ICleanupRepository, useClass: CleanupRepository },
  ],
  exports: [DemoQuotaService, CleanupService],
})
export class DemoModule {}
