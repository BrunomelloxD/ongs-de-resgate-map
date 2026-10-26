// Field messages shared by the signup and the profile; no zod here, so the
// dictionaries stay light for Client Components.
export const NGO_FIELD_MESSAGES = {
  closingBeforeOpening: 'O horário de fechamento deve ser depois da abertura.',
  // SPEC_DEVIATION: the spec asks for "erro no campo" without the text (SIGN-06, SIGN-08,
  // SIGN-11, SIGN-14, SIGN-22 and the address fields); simplest texts.
  legalNameRequired: 'Informe a razão social.',
  legalNameTooLong: 'A razão social pode ter até 150 caracteres.',
  descriptionLength: 'A descrição precisa ter de 30 a 600 caracteres.',
  emailInvalid: 'Informe um e-mail válido, como nome@ong.org.',
  whatsappInvalid: 'Informe o WhatsApp com DDD, como (11) 98765-4321.',
  cepInvalid: 'Digite os 8 números do CEP.',
  street: 'Informe o logradouro (até 150 caracteres).',
  number: 'Informe o número (até 10 caracteres).',
  complement: 'O complemento pode ter até 60 caracteres.',
  district: 'Informe o bairro (até 80 caracteres).',
  city: 'Informe a cidade (até 80 caracteres).',
  uf: 'Escolha a UF.',
  locationNotConfirmed: 'Confirme a localização no mapa para continuar.',
  hoursFormat: 'Informe a abertura e o fechamento no formato HH:MM.',
} as const;
