import { Module } from '@nestjs/common';
import { PasswordHasher } from '@/common/crypto/password-hasher.js';
import { RateLimiter } from '@/common/rate-limit/rate-limiter.service.js';
import { MailModule } from '@/modules/mail/mail.module.js';
import { NgosModule } from '@/modules/ngos/ngos.module.js';
import { SessionsModule } from '@/modules/sessions/sessions.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { PasswordResetsRepository } from './repositories/password-resets.repository.js';
import { IPasswordResetsRepository } from './repositories/password-resets.repository.interface.js';
import { AuthService } from './services/auth.service.js';
import { PasswordService } from './services/password.service.js';

@Module({
  imports: [NgosModule, SessionsModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    RateLimiter,
    PasswordHasher,
    { provide: IPasswordResetsRepository, useClass: PasswordResetsRepository },
  ],
})
export class AuthModule {}
