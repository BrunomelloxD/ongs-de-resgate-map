import type { SignupData } from './signup.types';

/** A complete wizard, as the steps keep it (masked CNPJ, WhatsApp and CEP). */
export function makeSignupData(): SignupData {
  return {
    about: {
      cnpj: '11.222.333/0001-81',
      legalName: 'Associação Protetora Patas do Bairro',
      description:
        'Resgatamos cães e gatos abandonados na Zona Sul de São Paulo desde 2014.',
    },
    contact: {
      email: 'contato@patasdobairro.org',
      whatsapp: '(11) 98765-4321',
      password: 'senha1234',
      confirmation: 'senha1234',
    },
    address: {
      cep: '04015-012',
      street: 'Rua Joaquim Távora',
      number: '1240',
      complement: '',
      district: 'Vila Mariana',
      city: 'São Paulo',
      uf: 'SP',
      location: {
        lat: -23.5869,
        lng: -46.6347,
        confirmedAt: '2026-10-20T12:00:00.000Z',
      },
    },
    hours: {
      openingHours: Array.from({ length: 7 }, (_, dayOfWeek) =>
        dayOfWeek === 0
          ? { dayOfWeek, closed: true, opensAt: null, closesAt: null }
          : dayOfWeek === 6
            ? { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '13:00' }
            : { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '18:00' },
      ),
    },
    review: { termsAccepted: false, demoAccepted: false },
  };
}
