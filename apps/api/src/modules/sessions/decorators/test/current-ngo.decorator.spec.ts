import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../guards/session.guard.js';
import { currentNgoFactory } from '../current-ngo.decorator.js';

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('@CurrentNgo()', () => {
  it('devolve { ngoId, sessionId } da sessão', () => {
    const request = { ngoSession: { ngoId: 'ngo-1', sessionId: 's-1' } };

    expect(currentNgoFactory(undefined, contextFor(request))).toEqual({
      ngoId: 'ngo-1',
      sessionId: 's-1',
    });
  });

  it('ignora ngoId enviado no corpo, na query e nos parâmetros (SEC-05)', () => {
    const request = {
      ngoSession: { ngoId: 'ngo-da-sessao', sessionId: 's-1' },
      body: { ngoId: 'ngo-de-outra' },
      query: { ngoId: 'ngo-de-outra' },
      params: { ngoId: 'ngo-de-outra' },
    };

    expect(currentNgoFactory(undefined, contextFor(request))).toEqual({
      ngoId: 'ngo-da-sessao',
      sessionId: 's-1',
    });
  });

  it('sem sessão no request (rota sem SessionGuard) responde 401', () => {
    const request = { body: { ngoId: 'ngo-de-outra' } };

    expect(() => currentNgoFactory(undefined, contextFor(request))).toThrow(
      UnauthorizedException,
    );
  });
});
