import { hashIp } from '../ip-hash.js';

const SECRET = 'dev-ip-hash-secret-000000000000000000000000';

describe('hashIp', () => {
  it('é o HMAC-SHA256 do IP com o segredo, em hex de 64 caracteres (cabe em signup_ip_hash)', () => {
    // openssl dgst -sha256 -hmac "$SECRET" <<< -n '203.0.113.1'
    expect(hashIp('203.0.113.1', SECRET)).toBe(
      '1646c23bdf327e03d6e5cf4905e46b259d9f982aad0643ab6695e658fc6f6618',
    );
  });

  it('outro segredo gera outro hash, e o IP não aparece no resultado', () => {
    const hash = hashIp('203.0.113.1', 'x'.repeat(32));

    expect(hash).not.toBe(hashIp('203.0.113.1', SECRET));
    expect(hash).not.toContain('203.0.113.1');
  });
});
