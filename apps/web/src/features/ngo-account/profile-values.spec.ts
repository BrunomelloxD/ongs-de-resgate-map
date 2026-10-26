import { makeMyNgo, makeProfileValues } from './test-fixtures';
import { toProfileValues } from './profile-values';

describe('toProfileValues', () => {
  it('PROF-01: a ONG salva vira os valores do formulário, com máscaras e o pino salvo', () => {
    expect(toProfileValues(makeMyNgo())).toEqual(makeProfileValues());
  });

  it('mantém o complemento salvo', () => {
    const ngo = makeMyNgo();
    const values = toProfileValues({
      ...ngo,
      address: { ...ngo.address, complement: 'Sala 2' },
    });

    expect(values.complement).toBe('Sala 2');
  });
});
