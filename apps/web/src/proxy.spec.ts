import { NextRequest } from 'next/server';
import { config, proxy } from './proxy';

function request(cookie?: string) {
  return new NextRequest('http://web.test/painel/animais', {
    headers: cookie ? { cookie } : {},
  });
}

describe('proxy', () => {
  it('sem o cookie ah_session redireciona para /entrar', () => {
    const response = proxy(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://web.test/entrar');
  });

  it('com outro cookie e sem o ah_session também redireciona', () => {
    const response = proxy(request('theme=dark'));

    expect(response.headers.get('location')).toBe('http://web.test/entrar');
  });

  it('com o cookie ah_session segue', () => {
    const response = proxy(request('ah_session=abc'));

    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('roda só em /painel', () => {
    expect(config.matcher).toEqual(['/painel/:path*']);
  });
});
