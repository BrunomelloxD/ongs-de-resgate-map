import { Module } from '@nestjs/common';
import { SessionGuard } from './guards/session.guard.js';
import { SessionsRepository } from './repositories/sessions.repository.js';
import { ISessionsRepository } from './repositories/sessions.repository.interface.js';
import { SessionsService } from './services/sessions.service.js';

@Module({
  providers: [
    SessionsService,
    SessionGuard,
    { provide: ISessionsRepository, useClass: SessionsRepository },
  ],
  // The repository is exported for the demo cleanup (expired sessions).
  exports: [SessionsService, SessionGuard, ISessionsRepository],
})
export class SessionsModule {}
