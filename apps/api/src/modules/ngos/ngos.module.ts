import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { PasswordHasher } from '@/common/crypto/password-hasher.js';
import { MediaModule, multerOptions } from '@/modules/media/media.module.js';
import { SessionsModule } from '@/modules/sessions/sessions.module.js';
import { MeNgoController } from './controllers/me-ngo.controller.js';
import { NgoSignupController } from './controllers/ngo-signup.controller.js';
import { NgosController } from './controllers/ngos.controller.js';
import { NgosRepository } from './repositories/ngos.repository.js';
import { INgosRepository } from './repositories/ngos.repository.interface.js';
import { NgosService } from './services/ngos.service.js';

// DemoQuotaService comes from the global DemoModule.
@Module({
  imports: [
    SessionsModule,
    MediaModule,
    // Same in-memory limits as the animal photos (PUT /me/ngo/image).
    MulterModule.registerAsync({
      inject: [AppConfigService],
      useFactory: multerOptions,
    }),
  ],
  controllers: [NgosController, NgoSignupController, MeNgoController],
  providers: [
    NgosService,
    PasswordHasher,
    { provide: INgosRepository, useClass: NgosRepository },
  ],
  exports: [NgosService],
})
export class NgosModule {}
