import { validate } from 'class-validator';
import { CNPJ_INVALID_MESSAGE, IsCnpj, isValidCnpj } from '../cnpj.js';

describe('isValidCnpj', () => {
  it('aceita um CNPJ numérico válido', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
  });

  it('aceita DV 0 quando o resto da divisão por 11 é menor que 2 (33.000.167/0001-01)', () => {
    expect(isValidCnpj('33000167000101')).toBe(true);
    expect(isValidCnpj('33000167000111')).toBe(false);
  });

  it('aceita o CNPJ alfanumérico de exemplo da Receita (12.ABC.345/01DE-35)', () => {
    expect(isValidCnpj('12ABC34501DE35')).toBe(true);
  });

  it('recusa quando o primeiro dígito verificador está errado', () => {
    expect(isValidCnpj('11222333000191')).toBe(false);
    expect(isValidCnpj('12ABC34501DE45')).toBe(false);
  });

  it('recusa quando só o segundo dígito verificador está errado', () => {
    expect(isValidCnpj('11222333000182')).toBe(false);
    expect(isValidCnpj('12ABC34501DE36')).toBe(false);
  });

  it('recusa letra nas posições dos dígitos verificadores', () => {
    expect(isValidCnpj('12ABC34501DEA5')).toBe(false);
    expect(isValidCnpj('12ABC34501DE3A')).toBe(false);
  });

  it('recusa tamanho diferente de 14', () => {
    expect(isValidCnpj('1122233300018')).toBe(false);
    expect(isValidCnpj('112223330001810')).toBe(false);
    expect(isValidCnpj('')).toBe(false);
  });

  it('recusa todos os caracteres iguais, mesmo com DV que confere', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('recusa caracteres fora de A–Z e 0–9 nas 12 primeiras posições', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(false);
    expect(isValidCnpj('12abc34501de35')).toBe(false);
  });

  it('recusa valores que não são texto', () => {
    expect(isValidCnpj(11222333000181)).toBe(false);
    expect(isValidCnpj(null)).toBe(false);
  });
});

describe('@IsCnpj', () => {
  class Payload {
    @IsCnpj()
    cnpj!: unknown;
  }

  function payload(cnpj: unknown): Payload {
    return Object.assign(new Payload(), { cnpj });
  }

  it('não gera erro para um CNPJ válido', async () => {
    expect(await validate(payload('12ABC34501DE35'))).toEqual([]);
  });

  it('gera o erro com a mensagem do spec para um CNPJ inválido', async () => {
    const [error] = await validate(payload('11222333000182'));

    expect(error?.property).toBe('cnpj');
    expect(error?.constraints).toEqual({
      isCnpj:
        'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.',
    });
    expect(CNPJ_INVALID_MESSAGE).toBe(
      'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.',
    );
  });
});
