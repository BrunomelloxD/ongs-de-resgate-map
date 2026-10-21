import { newPasswordSchema, passwordSchema } from './password';

const firstError = (value: string) =>
  passwordSchema.safeParse(value).error?.issues[0]?.message;

describe('passwordSchema', () => {
  it('aceita a senha que atende às 3 regras', () => {
    expect(passwordSchema.safeParse('senha1234').success).toBe(true);
  });

  it.each([
    ['senha12', 'A senha precisa de 8 ou mais caracteres.'],
    ['a1'.repeat(65), 'A senha pode ter até 128 caracteres.'],
    ['12345678', 'A senha precisa de ao menos uma letra.'],
    ['senhasemnumero', 'A senha precisa de ao menos um número.'],
  ])('recusa %j com "%s"', (value, message) => {
    expect(firstError(value)).toBe(message);
  });
});

describe('newPasswordSchema', () => {
  it('SIGN-16: confirmação diferente dá "As senhas não conferem." na confirmação', () => {
    const issue = newPasswordSchema.safeParse({
      password: 'senha1234',
      confirmation: 'senha12345',
    }).error?.issues[0];

    expect(issue?.path).toEqual(['confirmation']);
    expect(issue?.message).toBe('As senhas não conferem.');
  });

  it('aceita a confirmação igual', () => {
    expect(
      newPasswordSchema.safeParse({
        password: 'senha1234',
        confirmation: 'senha1234',
      }).success,
    ).toBe(true);
  });
});
