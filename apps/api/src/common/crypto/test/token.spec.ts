import { hashToken, newToken } from '../token.js';

describe('newToken', () => {
  it('gera 43 caracteres base64url (32 bytes)', () => {
    expect(newToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('dois tokens seguidos são diferentes', () => {
    expect(newToken()).not.toBe(newToken());
  });
});

describe('hashToken', () => {
  it('gera SHA-256 em hex com 64 caracteres', () => {
    expect(hashToken('qualquer-token')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('é determinístico', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('é o SHA-256 conhecido de "abc"', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('tokens diferentes geram hashes diferentes', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});
