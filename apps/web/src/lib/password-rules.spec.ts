import { PASSWORD_RULES } from './password-rules';

describe('PASSWORD_RULES', () => {
  it('SIGN-15: 8 ou mais caracteres, ao menos uma letra, ao menos um número', () => {
    expect(PASSWORD_RULES.map((rule) => rule.label)).toEqual([
      '8 ou mais caracteres',
      'Ao menos uma letra',
      'Ao menos um número',
    ]);
  });

  it.each([
    ['', [false, false, false]],
    ['1234567', [false, false, true]],
    ['abcdefgh', [true, true, false]],
    ['ção12345', [true, true, true]],
  ])('%j atende %j', (value, expected) => {
    expect(PASSWORD_RULES.map((rule) => rule.test(value))).toEqual(expected);
  });
});
