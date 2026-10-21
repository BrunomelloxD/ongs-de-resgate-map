import { Module } from '@nestjs/common';
import {
  MulterModule,
  type MulterModuleOptions,
} from '@nestjs/platform-express';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { SessionsModule } from '@/modules/sessions/sessions.module.js';
import { IObjectStorage } from './adapters/object-storage.js';
import { S3ObjectStorage } from './adapters/s3-object-storage.js';
import {
  IImageProcessor,
  SharpImageProcessor,
} from './adapters/sharp-image-processor.js';
import { MediaController } from './controllers/media.controller.js';
import { MediaRepository } from './repositories/media.repository.js';
import { IMediaRepository } from './repositories/media.repository.interface.js';
import { MediaService } from './services/media.service.js';

const MB = 1024 * 1024;

/** No `storage`: multer keeps the file in memory, never on disk. */
export function multerOptions(config: AppConfigService): MulterModuleOptions {
  // With the demo off this is the 10 MB of AFORM-08 (DemoQuotaService skips it).
  return { limits: { fileSize: config.demo.maxUploadMb * MB, files: 1 } };
}

// DemoQuotaService comes from the global DemoModule: importing it here would
// close a cycle with the cleanup, which depends on media.
@Module({
  imports: [
    SessionsModule,
    MulterModule.registerAsync({
      inject: [AppConfigService],
      useFactory: multerOptions,
    }),
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    { provide: IMediaRepository, useClass: MediaRepository },
    { provide: IObjectStorage, useClass: S3ObjectStorage },
    { provide: IImageProcessor, useClass: SharpImageProcessor },
  ],
  exports: [MediaService],
})
export class MediaModule {}
