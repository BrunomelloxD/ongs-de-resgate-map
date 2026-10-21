import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/session.guard.js';
import type { SessionContext } from '../services/sessions.service.js';

/** Exported so the tests can call it without a route. */
export function currentNgoFactory(
  _data: unknown,
  context: ExecutionContext,
): SessionContext {
  const { ngoSession } = context
    .switchToHttp()
    .getRequest<AuthenticatedRequest>();
  // Fails closed if a route forgets @UseGuards(SessionGuard).
  if (!ngoSession) {
    throw new UnauthorizedException();
  }
  return ngoSession;
}

/** `{ ngoId, sessionId }` of the session; never read from the body or query. */
export const CurrentNgo = createParamDecorator(currentNgoFactory);
