import { ValidateBy, type ValidationOptions } from 'class-validator';

export const CNPJ_INVALID_MESSAGE =
  'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.';

// Alphanumeric CNPJ (Receita Federal, 2026): A–Z allowed in the 12 base positions only.
const CNPJ_FORMAT = /^[0-9A-Z]{12}[0-9]{2}$/;
const ALL_SAME = /^(.)\1{13}$/;

/** Mod 11 check digit; each character is worth its char code − 48. */
function checkDigit(base: string): number {
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    const weight = ((base.length - 1 - i) % 8) + 2;
    sum += (base.charCodeAt(i) - 48) * weight;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: unknown): boolean {
  if (
    typeof value !== 'string' ||
    !CNPJ_FORMAT.test(value) ||
    ALL_SAME.test(value)
  ) {
    return false;
  }
  const first = checkDigit(value.slice(0, 12));
  const second = checkDigit(value.slice(0, 12) + first);
  return value.endsWith(`${first}${second}`);
}

export function IsCnpj(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isCnpj',
      validator: {
        validate: (value) => isValidCnpj(value),
        defaultMessage: () => CNPJ_INVALID_MESSAGE,
      },
    },
    options,
  );
}
