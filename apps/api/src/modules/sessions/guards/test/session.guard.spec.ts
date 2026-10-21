import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { SessionsService } from '../../services/sessions.service.js';
import { AuthenticatedRequest, SessionGuard } from '../session.guard.js';

const VALID = 'token-valido_0123456789';
const CONTEXT = { ngoId: 'ngo-da-sessao', sessionId: 's-1' };

function setup() {
  const sessions = {
    resolve: vi.fn((token: string) =>
      Promise.resolve(token === VALID ? CONTEXT : null),
    ),
  };
  const guard = new SessionGuard(sessions as unknown as SessionsService);
  return { sessions, guard };
}

function requestWith(
  authorization: string | undefined,
  extra: Partial<AuthenticatedRequest> = {},
) {
  const headers: Record<string, string> =
    authorization === undefined ? {} : { authorization };
  return {
    headers,
    header: (name: string) => headers[name.toLowerCase()],
    ...extra,
  } as unknown as AuthenticatedRequest;
}

function contextFor(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard', () => {
  it('sem header Authorization responde 401 (AUTH-07)', async () => {
    const { guard, sessions } = setup();

    await expect(
      guard.canActivate(contextFor(requestWith(undefined))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.resolve).not.toHaveBeenCalled();
  });

  it.each([
    ['sem o prefixo Bearer', VALID],
    ['outro esquema', `Basic ${VALID}`],
    ['Bearer sem token', 'Bearer '],
    ['dois tokens', `Bearer ${VALID} extra`],
  ])('header malformado (%s) responde 401', async (_case, header) => {
    const { guard, sessions } = setup();

    await expect(
      guard.canActivate(contextFor(requestWith(header))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.resolve).not.toHaveBeenCalled();
  });

  it('token que não resolve (desconhecido ou vencido) responde 401', async () => {
    const { guard, sessions } = setup();
    const request = requestWith('Bearer token-revogado');

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessions.resolve).toHaveBeenCalledWith('token-revogado');
    expect(request.ngoSession).toBeUndefined();
  });

  it('token válido libera a rota e preenche o contexto da sessão', async () => {
    const { guard } = setup();
    const request = requestWith(`Bearer ${VALID}`);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.ngoSession).toEqual({
      ngoId: 'ngo-da-sessao',
      sessionId: 's-1',
    });
  });

  it('um ngoId no corpo ou na query não muda o contexto (SEC-05)', async () => {
    const { guard } = setup();
    const request = requestWith(`Bearer ${VALID}`, {
      body: { ngoId: 'ngo-de-outra' },
      query: { ngoId: 'ngo-de-outra' },
    });

    await guard.canActivate(contextFor(request));

    expect(request.ngoSession?.ngoId).toBe('ngo-da-sessao');
  });
});
