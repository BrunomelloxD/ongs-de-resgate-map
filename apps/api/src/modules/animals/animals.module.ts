import { Module } from '@nestjs/common';
import { MediaModule } from '@/modules/media/media.module.js';
import { SessionsModule } from '@/modules/sessions/sessions.module.js';
import { AnimalsController } from './controllers/animals.controller.js';
import { MeAnimalsController } from './controllers/me-animals.controller.js';
import { AnimalsRepository } from './repositories/animals.repository.js';
import { IAnimalsRepository } from './repositories/animals.repository.interface.js';
import { AnimalsService } from './services/animals.service.js';

// DemoQuotaService comes from the global DemoModule.
@Module({
  imports: [SessionsModule, MediaModule],
  controllers: [AnimalsController, MeAnimalsController],
  providers: [
    AnimalsService,
    { provide: IAnimalsRepository, useClass: AnimalsRepository },
  ],
})
export class AnimalsModule {}
