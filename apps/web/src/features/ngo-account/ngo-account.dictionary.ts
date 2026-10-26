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
  profile: {
    /** PROF-04. */
    saved: 'Perfil atualizado.',
    /** PROF-03: the api's 400 text (edge cases of the spec). */
    locationNotConfirmed: 'Confirme a localização no mapa antes de salvar.',
    /** The api's 409 text (edge cases of the spec). */
    emailTaken: 'Este e-mail já tem cadastro.',
    // SPEC_DEVIATION: the spec doesn't word an api 400 on a field nor the generic errors.
    fieldRejected: 'Confira este campo.',
    invalid: 'Confira os campos marcados.',
    unavailable: 'Não foi possível salvar o perfil agora. Tente de novo.',
    // Headings, leads and hints follow the design (.specs/front/previews/11-*).
    title: 'Perfil da ONG',
    imageTitle: 'Imagem',
    imageLead: 'Aparece no mapa e no topo da página.',
    imageAlt: 'Imagem atual da ONG',
    imageChange: 'Trocar imagem',
    imagePick: 'Enviar uma imagem',
    imageHint: (maxMb: number) => `JPG, PNG ou WebP, até ${maxMb} MB.`,
    // SPEC_DEVIATION: the spec doesn't word the upload states of the profile.
    imageUploading: 'Enviando a imagem…',
    imageUploaded: 'Imagem atualizada.',
    dataTitle: 'Dados da ONG',
    dataLead: 'O CNPJ não muda depois do cadastro.',
    cnpj: 'CNPJ',
    cnpjHint: 'Para alterar, fale com o suporte.',
    legalName: 'Razão social',
    description: 'Descrição',
    counter: (length: number) => `${length}/600 caracteres`,
    contactTitle: 'Contato e acesso',
    contactLead: 'O WhatsApp recebe os interessados.',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    whatsappHint: 'Com DDD.',
    addressTitle: 'Endereço',
    addressLead: 'Mudou de endereço? Confira o pino de novo.',
    hoursTitle: 'Horário de funcionamento',
    hoursLead: '"Aberta agora" no mapa usa estes horários.',
    dayError: (day: string, message: string) => `${day}: ${message}`,
    errorSummaryTitle: 'Corrija para continuar',
    submit: 'Salvar alterações',
    pending: 'Salvando…',
  },
  password: {
    /** PROF-06. */
    wrongCurrent: 'Senha atual incorreta.',
    /** Edge case of the spec: the NGO of the session is gone. */
    ngoNotFound: 'ONG não encontrada.',
    // SPEC_DEVIATION: the spec doesn't word the success (the session stays, PROF-05),
    // the labels, the empty current password nor the generic error.
    changed: 'Senha alterada. As outras sessões foram encerradas.',
    title: 'Alterar senha',
    lead: 'As outras sessões abertas vão precisar entrar de novo.',
    currentPassword: 'Senha atual',
    currentRequired: 'Informe a senha atual.',
    password: 'Nova senha',
    confirmation: 'Confirme a nova senha',
    rulesTitle: 'A senha precisa ter:',
    ruleMet: 'atendida',
    ruleUnmet: 'não atendida',
    submit: 'Alterar senha',
    pending: 'Alterando…',
    errorSummaryTitle: 'Corrija para continuar',
    unavailable: 'Não foi possível alterar a senha agora. Tente de novo.',
  },
  deleteAccount: {
    /** PROF-08. */
    unavailable: 'Não foi possível excluir agora. Tente de novo.',
    // SPEC_DEVIATION: the spec asks the dialog to explain what goes away (PROF-07)
    // without the words; texts follow the animal delete dialog.
    open: 'Excluir conta',
    title: 'Excluir a conta da ONG?',
    lead: 'Isso apaga para sempre, sem como desfazer:',
    items: [
      'os dados da ONG e a página pública',
      'os horários de funcionamento',
      'todos os animais e as fotos',
      'as sessões abertas em outros aparelhos',
    ],
    password: 'Senha atual',
    passwordHint: 'Para confirmar, digite a senha da conta.',
    confirm: 'Excluir conta para sempre',
    pending: 'Excluindo…',
    cancel: 'Cancelar',
  },
  page: {
    metaTitle: 'Perfil da ONG',
    // SPEC_DEVIATION: the spec doesn't word the way back nor the danger zone.
    back: 'Voltar para o painel',
    changePassword: 'Alterar senha',
    dangerTitle: 'Excluir a conta',
    dangerLead: 'Apaga a ONG, os animais e as fotos. Não dá para desfazer.',
  },
} as const;
