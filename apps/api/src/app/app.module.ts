import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from '@/common/config/config.module.js';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { ClientIpThrottlerGuard } from '@/common/guards/client-ip-throttler.guard.js';
import { InternalTokenGuard } from '@/common/guards/internal-token.guard.js';
import { PrismaExceptionFilter } from '@/common/filters/prisma-exception.filter.js';
import { LoggerModule } from '@/common/logger/logger.module.js';
import { PrismaModule } from '@/common/prisma/prisma.module.js';
import { AnimalsModule } from '@/modules/animals/animals.module.js';
import { AuthModule } from '@/modules/auth/auth.module.js';
import { DemoModule } from '@/modules/demo/demo.module.js';
import { GeoModule } from '@/modules/geo/geo.module.js';
import { HealthModule } from '@/modules/health/health.module.js';
import { MediaModule } from '@/modules/media/media.module.js';
import { NgosModule } from '@/modules/ngos/ngos.module.js';
import { SessionsModule } from '@/modules/sessions/sessions.module.js';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL'),
          limit: config.get('THROTTLE_LIMIT'),
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    SessionsModule,
    DemoModule,
    GeoModule,
    MediaModule,
    NgosModule,
    AnimalsModule,
    AuthModule,
  ],
  providers: [
    // Order matters: the token is checked before anything else.
    { provide: APP_GUARD, useClass: InternalTokenGuard },
    { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
