import { timezoneForUf } from '../timezone-for-uf.js';

// IANA zone of each state's capital (tz database, Brazil without DST since 2019).
const EXPECTED: Record<string, string> = {
  AC: 'America/Rio_Branco',
  AL: 'America/Maceio',
  AM: 'America/Manaus',
  AP: 'America/Belem',
  BA: 'America/Bahia',
  CE: 'America/Fortaleza',
  DF: 'America/Sao_Paulo',
  ES: 'America/Sao_Paulo',
  GO: 'America/Sao_Paulo',
  MA: 'America/Fortaleza',
  MG: 'America/Sao_Paulo',
  MS: 'America/Campo_Grande',
  MT: 'America/Cuiaba',
  PA: 'America/Belem',
  PB: 'America/Fortaleza',
  PE: 'America/Recife',
  PI: 'America/Fortaleza',
  PR: 'America/Sao_Paulo',
  RJ: 'America/Sao_Paulo',
  RN: 'America/Fortaleza',
  RO: 'America/Porto_Velho',
  RR: 'America/Boa_Vista',
  RS: 'America/Sao_Paulo',
  SC: 'America/Sao_Paulo',
  SE: 'America/Maceio',
  SP: 'America/Sao_Paulo',
  TO: 'America/Araguaina',
};

describe('timezoneForUf', () => {
  it('AM → America/Manaus', () => {
    expect(timezoneForUf('AM')).toBe('America/Manaus');
  });

  it('SP → America/Sao_Paulo', () => {
    expect(timezoneForUf('SP')).toBe('America/Sao_Paulo');
  });

  it('UF desconhecida → America/Sao_Paulo', () => {
    expect(timezoneForUf('XX')).toBe('America/Sao_Paulo');
    expect(timezoneForUf('')).toBe('America/Sao_Paulo');
    expect(timezoneForUf('constructor')).toBe('America/Sao_Paulo');
  });

  it('mapeia as 27 UFs', () => {
    expect(Object.keys(EXPECTED)).toHaveLength(27);
    for (const [uf, zone] of Object.entries(EXPECTED)) {
      expect({ uf, zone: timezoneForUf(uf) }).toEqual({ uf, zone });
    }
  });

  it('todo fuso devolvido é aceito pelo Intl', () => {
    for (const uf of Object.keys(EXPECTED)) {
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: timezoneForUf(uf) }),
      ).not.toThrow();
    }
  });
});
