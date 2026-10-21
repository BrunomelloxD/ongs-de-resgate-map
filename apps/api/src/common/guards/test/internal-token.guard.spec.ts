import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import { InternalTokenGuard } from '../internal-token.guard.js';

const TOKEN = 'x'.repeat(40);

function guard() {
  return new InternalTokenGuard({
    internalApiToken: TOKEN,
  } as AppConfigService);
}

function contextFor(path: string, headers: Record<string, string> = {}) {
  const request = {
    path,
    header: (name: string) => headers[name.toLowerCase()],
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('InternalTokenGuard', () => {
  it('deixa passar com o token certo', () => {
    expect(
      guard().canActivate(
        contextFor('/api/v1/ngos', { 'x-internal-token': TOKEN }),
      ),
    ).toBe(true);
  });

  it('responde 401 quando o header está ausente', () => {
    expect(() => guard().canActivate(contextFor('/api/v1/ngos'))).toThrow(
      UnauthorizedException,
    );
  });

  it('responde 401 quando o header está vazio', () => {
    expect(() =>
      guard().canActivate(
        contextFor('/api/v1/ngos', { 'x-internal-token': '' }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('responde 401 quando o token tem tamanho diferente', () => {
    expect(() =>
      guard().canActivate(
        contextFor('/api/v1/ngos', { 'x-internal-token': TOKEN.slice(1) }),
      ),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard().canActivate(
        contextFor('/api/v1/ngos', { 'x-internal-token': `${TOKEN}x` }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('responde 401 quando o token tem o mesmo tamanho mas é outro', () => {
    expect(() =>
      guard().canActivate(
        contextFor('/api/v1/ngos', { 'x-internal-token': 'y'.repeat(40) }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('o 401 não traz detalhes sobre o motivo', () => {
    try {
      guard().canActivate(contextFor('/api/v1/ngos'));
      expect.unreachable();
    } catch (error) {
      expect((error as UnauthorizedException).getResponse()).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    }
  });

  it('libera /health sem token', () => {
    expect(guard().canActivate(contextFor('/health'))).toBe(true);
  });
});
