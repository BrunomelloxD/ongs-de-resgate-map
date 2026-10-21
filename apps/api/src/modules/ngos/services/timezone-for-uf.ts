const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

// Capital of each state; a Map so keys like "constructor" fall back to the default.
const TIMEZONE_BY_UF = new Map<string, string>([
  ['AC', 'America/Rio_Branco'],
  ['AL', 'America/Maceio'],
  ['AM', 'America/Manaus'],
  ['AP', 'America/Belem'],
  ['BA', 'America/Bahia'],
  ['CE', 'America/Fortaleza'],
  ['DF', 'America/Sao_Paulo'],
  ['ES', 'America/Sao_Paulo'],
  ['GO', 'America/Sao_Paulo'],
  ['MA', 'America/Fortaleza'],
  ['MG', 'America/Sao_Paulo'],
  ['MS', 'America/Campo_Grande'],
  ['MT', 'America/Cuiaba'],
  ['PA', 'America/Belem'],
  ['PB', 'America/Fortaleza'],
  ['PE', 'America/Recife'],
  ['PI', 'America/Fortaleza'],
  ['PR', 'America/Sao_Paulo'],
  ['RJ', 'America/Sao_Paulo'],
  ['RN', 'America/Fortaleza'],
  ['RO', 'America/Porto_Velho'],
  ['RR', 'America/Boa_Vista'],
  ['RS', 'America/Sao_Paulo'],
  ['SC', 'America/Sao_Paulo'],
  ['SE', 'America/Maceio'],
  ['SP', 'America/Sao_Paulo'],
  ['TO', 'America/Araguaina'],
]);

/** NGO timezone derived from its state (SIGN-30). */
export function timezoneForUf(uf: string): string {
  return TIMEZONE_BY_UF.get(uf) ?? DEFAULT_TIMEZONE;
}
