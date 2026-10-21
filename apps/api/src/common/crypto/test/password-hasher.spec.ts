import { PasswordHasher } from '../password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('gera um hash Argon2id', async () => {
    expect(await hasher.hash('Senha-correta-1')).toMatch(/^\$argon2id\$/);
  });

  it('verify aceita a senha certa', async () => {
    const hash = await hasher.hash('Senha-correta-1');

    expect(await hasher.verify(hash, 'Senha-correta-1')).toBe(true);
  });

  it('verify recusa a senha errada', async () => {
    const hash = await hasher.hash('Senha-correta-1');

    expect(await hasher.verify(hash, 'Senha-errada-2')).toBe(false);
  });

  it('a mesma senha gera hashes diferentes (salt aleatório)', async () => {
    expect(await hasher.hash('Senha-correta-1')).not.toBe(
      await hasher.hash('Senha-correta-1'),
    );
  });
});
