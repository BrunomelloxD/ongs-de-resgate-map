import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppConfigService } from '@/common/config/app-config.service.js';

const HEALTH_PATH = '/health';

/** Hashing first makes both buffers the same length for timingSafeEqual. */
function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Every route needs the token the web sends; only /health is open (AD-002). */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.path === HEALTH_PATH) {
      return true;
    }

    const sent = request.header('x-internal-token') ?? '';
    const valid =
      sent !== '' &&
      timingSafeEqual(digest(sent), digest(this.config.internalApiToken));

    if (!valid) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
