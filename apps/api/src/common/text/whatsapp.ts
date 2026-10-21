import type { Sex } from '@/generated/prisma/enums.js';

/** RN-08: the article follows the animal's sex (ANI-04). */
export function buildAdoptionMessage(name: string, sex: Sex): string {
  const article = sex === 'FEMALE' ? 'a' : 'o';
  return `Olá! Vi ${article} ${name} no Animal Helper e quero saber como adotar.`;
}

export function buildNgoMessage(ngoName: string): string {
  return `Olá! Vi a ${ngoName} no Animal Helper.`;
}

/** The number is already stored as 55 + DDD + number, digits only (SIGN-13). */
export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
