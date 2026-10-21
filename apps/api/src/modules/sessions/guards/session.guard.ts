import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  SessionContext,
  SessionsService,
} from '../services/sessions.service.js';

/** Request after SessionGuard: the NGO comes only from the token (SEC-05). */
export interface AuthenticatedRequest extends Request {
  ngoSession?: SessionContext;
}

const BEARER = /^Bearer ([A-Za-z0-9_-]+)$/;

/** Protects the /me/* routes (AUTH-07). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER.exec(request.header('authorization') ?? '')?.[1];
    const session = token ? await this.sessions.resolve(token) : null;

    if (!session) {
      throw new UnauthorizedException();
    }
    request.ngoSession = session;
    return true;
  }
}
