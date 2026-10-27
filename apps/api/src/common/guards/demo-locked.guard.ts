import {
  applyDecorators,
  CanActivate,
  ForbiddenException,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { AppConfigService } from '@/common/config/app-config.service.js';

export const DEMO_LOCKED_MESSAGE = 'Indisponível na demo.';

/** Locked demo (AD-008): the route answers 403 and changes nothing. */
@Injectable()
export class DemoLockedGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(): boolean {
    if (this.config.demoLocked) {
      throw new ForbiddenException(DEMO_LOCKED_MESSAGE);
    }
    return true;
  }
}

/** Signup, password reset and changes to the shared account (DEP-10 to DEP-12). */
export const BlockedWhenDemoLocked = () =>
  applyDecorators(
    UseGuards(DemoLockedGuard),
    ApiForbiddenResponse({ description: `${DEMO_LOCKED_MESSAGE} (AD-008)` }),
  );
