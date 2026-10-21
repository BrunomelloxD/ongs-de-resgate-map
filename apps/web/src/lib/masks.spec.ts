import {
  isValidCnpj,
  isValidWhatsapp,
  maskCep,
  maskCnpj,
  maskWhatsapp,
  normalizeCep,
  normalizeCnpj,
  normalizeWhatsapp,
  toWhatsappNumber,
} from './masks';

describe('maskCnpj / normalizeCnpj', () => {
  it('12abc34501de35 → 12.ABC.345/01DE-35 (letras nas 12 primeiras, maiúsculas)', () => {
    expect(maskCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35');
    expect(normalizeCnpj('12abc34501de35')).toBe('12ABC34501DE35');
  });

  it('CNPJ numérico', () => {
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });

  it.each([
    ['', ''],
    ['1', '1'],
    ['12', '12'],
    ['123', '12.3'],
    ['12345', '12.345'],
    ['123456', '12.345.6'],
    ['12345678', '12.345.678'],
    ['123456789', '12.345.678/9'],
    ['123456780001', '12.345.678/0001'],
    ['1234567800018', '12.345.678/0001-8'],
  ])('mascara enquanto digita %j → %j', (input, expected) => {
    expect(maskCnpj(input)).toBe(expected);
  });

  it('aceita o valor já mascarado e ignora símbolos', () => {
    expect(maskCnpj('12.ABC.345/01DE-35')).toBe('12.ABC.345/01DE-35');
    expect(normalizeCnpj(' 12 ABC-345 ')).toBe('12ABC345');
  });

  it('letras não entram nas posições dos dígitos verificadores', () => {
    expect(normalizeCnpj('12ABC34501DEA5')).toBe('12ABC34501DE5');
    expect(maskCnpj('12ABC34501DEZZ')).toBe('12.ABC.345/01DE');
  });

  it('corta em 14 caracteres', () => {
    expect(normalizeCnpj('11222333000181999')).toBe('11222333000181');
  });
});

describe('isValidCnpj', () => {
  it.each(['11222333000181', '33000167000101', '12ABC34501DE35'])(
    'aceita %s',
    (value) => {
      expect(isValidCnpj(value)).toBe(true);
    },
  );

  it.each([
    ['DV errado', '11222333000191'],
    ['segundo DV errado', '12ABC34501DE36'],
    ['letra nos DVs', '12ABC34501DEA5'],
    ['curto', '1122233300018'],
    ['longo', '112223330001810'],
    ['vazio', ''],
    ['todos iguais', '11111111111111'],
    ['minúsculas', '12abc34501de35'],
    ['mascarado', '11.222.333/0001-81'],
  ])('recusa %s', (_name, value) => {
    expect(isValidCnpj(value)).toBe(false);
  });
});

describe('WhatsApp', () => {
  it('11987654321 → (11) 98765-4321 e 5511987654321', () => {
    expect(maskWhatsapp('11987654321')).toBe('(11) 98765-4321');
    expect(toWhatsappNumber('11987654321')).toBe('5511987654321');
    expect(toWhatsappNumber('(11) 98765-4321')).toBe('5511987654321');
  });

  it('fixo de 10 dígitos é aceito e mascarado com 4-4', () => {
    expect(isValidWhatsapp('1133334444')).toBe(true);
    expect(maskWhatsapp('1133334444')).toBe('(11) 3333-4444');
    expect(toWhatsappNumber('1133334444')).toBe('551133334444');
  });

  it.each([
    ['', ''],
    ['1', '(1'],
    ['11', '(11'],
    ['119', '(11) 9'],
    ['119876', '(11) 9876'],
    ['1198765', '(11) 9876-5'],
    ['11987654', '(11) 9876-54'],
    ['1198765432', '(11) 9876-5432'],
  ])('mascara enquanto digita %j → %j', (input, expected) => {
    expect(maskWhatsapp(input)).toBe(expected);
  });

  it('corta em 11 dígitos e ignora letras', () => {
    expect(normalizeWhatsapp('(11) 98765-4321 99')).toBe('11987654321');
    expect(normalizeWhatsapp('1a1b')).toBe('11');
  });

  it.each(['20', '10', '23', '00', '90'])('DDD %s é recusado', (ddd) => {
    expect(isValidWhatsapp(`${ddd}987654321`)).toBe(false);
    expect(isValidWhatsapp(`${ddd}33334444`)).toBe(false);
  });

  it.each(['11', '21', '55', '99', '47'])('DDD %s é aceito', (ddd) => {
    expect(isValidWhatsapp(`${ddd}987654321`)).toBe(true);
  });

  it.each(['119876543', '119876543210', '', '11'])(
    'tamanho inválido %j é recusado',
    (value) => {
      expect(isValidWhatsapp(value)).toBe(false);
    },
  );
});

describe('CEP', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['04101', '04101'],
    ['041013', '04101-3'],
    ['04101300', '04101-300'],
    ['04101-300', '04101-300'],
    ['041013001234', '04101-300'],
  ])('mascara %j → %j', (input, expected) => {
    expect(maskCep(input)).toBe(expected);
  });

  it('normaliza para 8 dígitos', () => {
    expect(normalizeCep('04101-300')).toBe('04101300');
    expect(normalizeCep('abc')).toBe('');
  });
});
