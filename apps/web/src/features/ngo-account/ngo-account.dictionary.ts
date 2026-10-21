// Texts shared by the signup and the profile (NGO image, address and hours).
// Labels follow the design (.specs/front/previews/07c, 07d).
export const ngoAccountDictionary = {
  image: {
    /** SIGN-10, with N = MAX_UPLOAD_MB. */
    invalid: (maxMb: number) => `Envie JPG, PNG ou WebP de até ${maxMb} MB.`,
    storageFull:
      'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
    // SPEC_DEVIATION: the spec doesn't define the generic upload error.
    unavailable: 'Não foi possível enviar a imagem agora. Tente de novo.',
  },
  address: {
    cep: 'CEP',
    cepHint: 'Preenchemos o resto do endereço pelo CEP.',
    street: 'Logradouro',
    number: 'Número',
    complement: 'Complemento (opcional)',
    complementPlaceholder: 'Ex.: sala 2',
    district: 'Bairro',
    city: 'Cidade',
    uf: 'UF',
    ufPlaceholder: 'Escolha',
    mapTitle: 'Confira o pino no mapa',
    // SPEC_DEVIATION: the spec asks for "um aviso" (SIGN-18) and doesn't word the
    // waiting states nor the address the map can't place; simplest texts.
    cepLoading: 'Buscando o endereço pelo CEP…',
    cepFailed:
      'Não conseguimos preencher o endereço pelo CEP. Preencha todos os campos abaixo.',
    mapWaiting: 'Complete o endereço para ver o pino no mapa.',
    geocoding: 'Procurando o endereço no mapa…',
    geocodeFailed:
      'Não encontramos este endereço no mapa. Confira os dados do endereço.',
  },
  hours: {
    /** SIGN-24. */
    copyMonday: 'Copiar o horário de segunda para todos os dias',
    /** By dayOfWeek, 0 = Sunday. */
    days: [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ],
    open: 'Aberta',
    closed: 'Fechada',
    // SPEC_DEVIATION: the spec doesn't word the switch and the time labels.
    switchLabel: (day: string) => `${day}: aberta`,
    opensAt: 'Abertura',
    closesAt: 'Fechamento',
    until: 'até',
  },
} as const;
