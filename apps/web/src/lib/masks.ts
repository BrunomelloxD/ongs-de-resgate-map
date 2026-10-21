// Isomorphic input masks. The `mask*` functions format while the user types;
// the `normalize*` ones give the value that is validated and sent to the api.

// ---------- CNPJ (SIGN-03, SIGN-04) ----------

/** Alphanumeric CNPJ: A–Z allowed in the 12 base positions, digits only in the 2 check digits. */
export function normalizeCnpj(input: string): string {
  let result = '';

  for (const char of input.toUpperCase()) {
    if (result.length === 14) break;
    const allowed = result.length < 12 ? /[0-9A-Z]/ : /[0-9]/;
    if (allowed.test(char)) result += char;
  }

  return result;
}

/** `XX.XXX.XXX/XXXX-99`, built as far as the typed characters go. */
export function maskCnpj(input: string): string {
  const v = normalizeCnpj(input);

  return [
    v.slice(0, 2),
    v.length > 2 ? `.${v.slice(2, 5)}` : '',
    v.length > 5 ? `.${v.slice(5, 8)}` : '',
    v.length > 8 ? `/${v.slice(8, 12)}` : '',
    v.length > 12 ? `-${v.slice(12, 14)}` : '',
  ].join('');
}

const CNPJ_FORMAT = /^[0-9A-Z]{12}[0-9]{2}$/;
const CNPJ_ALL_SAME = /^(.)\1{13}$/;

/** Mod 11 check digit; each character is worth its char code − 48. */
function cnpjCheckDigit(base: string): number {
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    const weight = ((base.length - 1 - i) % 8) + 2;
    sum += (base.charCodeAt(i) - 48) * weight;
  }
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Mirror of `isValidCnpj` in `apps/api/src/common/validation/cnpj.ts`.
 * Takes the normalized value (see `normalizeCnpj`).
 */
export function isValidCnpj(value: string): boolean {
  if (!CNPJ_FORMAT.test(value) || CNPJ_ALL_SAME.test(value)) return false;

  const first = cnpjCheckDigit(value.slice(0, 12));
  const second = cnpjCheckDigit(value.slice(0, 12) + first);

  return value.endsWith(`${first}${second}`);
}

// ---------- WhatsApp (SIGN-13, SIGN-14) ----------

/** Area codes in use in Brazil (Anatel); same list as the api. */
const DDDS = new Set(
  (
    '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 ' +
    '47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 ' +
    '86 87 88 89 91 92 93 94 95 96 97 98 99'
  ).split(' '),
);

/** The national number as typed: DDD + number, digits only, up to 11. */
export function normalizeWhatsapp(input: string): string {
  return input.replace(/\D/g, '').slice(0, 11);
}

/** `(99) 99999-9999`, or `(99) 9999-9999` for a 10-digit landline. */
export function maskWhatsapp(input: string): string {
  const v = normalizeWhatsapp(input);
  if (v.length <= 2) return v ? `(${v}` : '';

  const split = v.length > 10 ? 7 : 6;

  return [
    `(${v.slice(0, 2)}) ${v.slice(2, split)}`,
    v.length > split ? `-${v.slice(split)}` : '',
  ].join('');
}

/** SIGN-14: a valid DDD plus 8 or 9 digits (10 or 11 in total). */
export function isValidWhatsapp(input: string): boolean {
  // Not truncated: a 12th digit makes the number invalid.
  const v = input.replace(/\D/g, '');

  return (v.length === 10 || v.length === 11) && DDDS.has(v.slice(0, 2));
}

/** SIGN-13: what the api stores, `55` + DDD + number, digits only. */
export function toWhatsappNumber(input: string): string {
  return `55${normalizeWhatsapp(input)}`;
}

// ---------- CEP ----------

/** Digits only, up to 8. */
export function normalizeCep(input: string): string {
  return input.replace(/\D/g, '').slice(0, 8);
}

/** `99999-999`. */
export function maskCep(input: string): string {
  const v = normalizeCep(input);

  return v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
}
