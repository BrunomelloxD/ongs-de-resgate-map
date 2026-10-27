import { ForbiddenException } from '@nestjs/common';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import { DemoLockedGuard } from '../demo-locked.guard.js';

const guard = (demoLocked: boolean) =>
  new DemoLockedGuard({ demoLocked } as AppConfigService);

describe('DemoLockedGuard', () => {
  it('com a demo fechada responde 403 com "Indisponível na demo." (DEP-10 a DEP-12)', () => {
    let error: unknown;
    try {
      guard(true).canActivate();
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getStatus()).toBe(403);
    expect((error as ForbiddenException).message).toBe('Indisponível na demo.');
  });

  it('com a demo aberta deixa passar (DEP-15)', () => {
    expect(guard(false).canActivate()).toBe(true);
  });
});
