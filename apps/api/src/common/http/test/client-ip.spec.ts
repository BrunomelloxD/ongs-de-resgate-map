import { getClientIp } from '../client-ip.js';

function req(headers: Record<string, string | string[]>, ip?: string) {
  return { headers, ip };
}

describe('getClientIp', () => {
  it('lê o IP do header X-Client-IP', () => {
    expect(getClientIp(req({ 'x-client-ip': '203.0.113.7' }, '10.0.0.2'))).toBe(
      '203.0.113.7',
    );
  });

  it('cai no IP da conexão quando o header está ausente', () => {
    expect(getClientIp(req({}, '10.0.0.2'))).toBe('10.0.0.2');
  });

  it('cai no IP da conexão quando o header está vazio', () => {
    expect(getClientIp(req({ 'x-client-ip': '' }, '10.0.0.2'))).toBe(
      '10.0.0.2',
    );
  });

  it('usa o primeiro IP de uma lista separada por vírgula', () => {
    expect(
      getClientIp(
        req({ 'x-client-ip': '203.0.113.7, 198.51.100.9' }, '10.0.0.2'),
      ),
    ).toBe('203.0.113.7');
  });

  it('usa o primeiro IP quando o header chega repetido', () => {
    expect(
      getClientIp(
        req({ 'x-client-ip': ['203.0.113.7', '198.51.100.9'] }, '10.0.0.2'),
      ),
    ).toBe('203.0.113.7');
  });

  it('devolve "unknown" quando não há header nem IP de conexão', () => {
    expect(getClientIp(req({}))).toBe('unknown');
  });
});
