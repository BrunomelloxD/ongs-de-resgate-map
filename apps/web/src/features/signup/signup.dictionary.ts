// Texts of the signup wizard (.specs/front/previews/07-*). The spec fixes the messages of
// SIGN-04, SIGN-05, SIGN-10, SIGN-16, SIGN-25, the shortcuts of SIGN-12 and the counter of SIGN-07.
export const signupDictionary = {
  page: {
    metaTitle: 'Cadastro da ONG',
    title: 'Cadastro da ONG',
    // SPEC_DEVIATION: the spec doesn't word the arrow nor the error page of the wizard.
    back: 'Voltar',
    errorTitle: 'Não conseguimos abrir o cadastro.',
    retry: 'Tentar novamente',
  },
  validation: {
    cnpjInvalid:
      'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.',
    closingBeforeOpening:
      'O horário de fechamento deve ser depois da abertura.',
    // SPEC_DEVIATION: the spec asks for "erro no campo" without the text (SIGN-06, SIGN-08,
    // SIGN-11, SIGN-14, SIGN-22, SIGN-27, DEMO-03 and the address fields); simplest texts.
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
    termsRequired:
      'Aceite os Termos de uso e a Política de privacidade para criar a conta.',
    demoRequired: 'Marque que você entendeu que esta é uma demonstração.',
  },
  // SPEC_DEVIATION: the error summary title; the design's "Corrija 1 campo" counts the
  // fields, the login and the reset use the simpler "Corrija para continuar".
  errorSummaryTitle: 'Corrija para continuar',
  about: {
    title: 'Sobre a ONG',
    lead: 'Esses dados aparecem na página pública da ONG.',
    cnpj: 'CNPJ',
    // SPEC_DEVIATION: the design's hint says "só números"; SIGN-03 takes letters too.
    cnpjHint:
      'Letras e números; a máscara XX.XXX.XXX/XXXX-99 é aplicada sozinha.',
    legalName: 'Razão social',
    description: 'Descrição',
    /** SIGN-07. */
    counter: (length: number) => `${length}/600`,
    image: 'Logo ou foto da ONG',
    imagePick: 'Toque para enviar uma imagem',
    // SPEC_DEVIATION: the design lists JPG and PNG; SIGN-09 also takes WebP.
    imageHint: (maxMb: number) =>
      `JPG, PNG ou WebP, até ${maxMb} MB. Aparece no mapa e na página da ONG.`,
    /** SIGN-10, with N = MAX_UPLOAD_MB. */
    imageInvalid: (maxMb: number) =>
      `Envie JPG, PNG ou WebP de até ${maxMb} MB.`,
    imagePreview: 'Prévia da imagem da ONG',
    imageChange: 'Trocar imagem',
    imageRemove: 'Remover imagem',
    submit: 'Ir para Contato',
    // SPEC_DEVIATION: the spec doesn't name the state while the CNPJ is checked.
    checking: 'Conferindo o CNPJ…',
  },
  contact: {
    title: 'Contato e acesso',
    lead: 'O WhatsApp recebe os interessados em adotar. E-mail e senha são para entrar no painel.',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    whatsappHint:
      'Com DDD. É para este número que os interessados vão escrever.',
    password: 'Senha',
    rulesTitle: 'A senha precisa ter:',
    ruleMet: 'atendida',
    ruleUnmet: 'não atendida',
    confirmation: 'Confirmar senha',
    /** SIGN-12 shortcuts. */
    loginWithEmail: 'Entrar com este e-mail',
    recoverPassword: 'Recuperar senha',
    back: 'Voltar',
    submit: 'Ir para Endereço',
    // SPEC_DEVIATION: the spec doesn't name the state while the e-mail is checked.
    checking: 'Conferindo o e-mail…',
  },
  address: {
    title: 'Endereço',
    lead: 'Usamos o endereço para colocar a ONG no mapa.',
    back: 'Voltar',
    submit: 'Ir para Horário',
  },
  hours: {
    title: 'Horário de funcionamento',
    lead: 'Com ele mostramos “aberta agora” no mapa.',
    back: 'Voltar',
    submit: 'Revisar cadastro',
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
    /** The summary names the day of each error. */
    dayError: (day: string, message: string) => `${day}: ${message}`,
  },
  review: {
    title: 'Revisão',
    lead: 'Confira tudo antes de criar a conta.',
    edit: 'Editar',
    /** The visible "Editar" plus the section, for screen readers. */
    editLabel: (section: string) => `Editar ${section}`,
    about: 'Sobre a ONG',
    contact: 'Contato e acesso',
    address: 'Endereço',
    hours: 'Horário',
    image: 'Imagem da ONG',
    cnpj: 'CNPJ',
    legalName: 'Razão social',
    description: 'Descrição',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    interval: (opensAt: string, closesAt: string) =>
      `${opensAt} às ${closesAt}`,
    closed: 'Fechada',
    termsBefore: 'Li e aceito os ',
    terms: 'Termos de uso',
    termsBetween: ' e a ',
    privacy: 'Política de privacidade',
    termsAfter: '.',
    /** DEMO-03, with N = DEMO_RETENTION_DAYS. */
    demo: (days: number) =>
      `Entendi que esta é uma demonstração e que a ONG, os animais e as fotos serão apagados em ${days} dias.`,
    back: 'Voltar',
    /** SIGN-27. */
    submit: 'Criar conta',
    // SPEC_DEVIATION: the spec doesn't name the state while the account is created.
    pending: 'Criando a conta…',
  },
  create: {
    /** DEMO-07. */
    ngoQuota:
      'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.',
    /** DEMO-08. */
    ipQuota: 'Limite de cadastros desta rede por hoje. Tente de novo amanhã.',
    // SPEC_DEVIATION: the spec doesn't word a rejected payload or an api failure.
    invalid: 'Confira os dados desta etapa e tente de novo.',
    unavailable: 'Não foi possível criar a conta agora. Tente de novo.',
  },
  availability: {
    cnpjTaken:
      'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.',
    /** Edge case confirmed by the user on 20/10/2026, same as the api's 409. */
    emailTaken: 'Este e-mail já tem cadastro.',
    // SPEC_DEVIATION: the spec doesn't define the throttle (429) or failure notice.
    cnpjUnchecked:
      'Não conseguimos conferir o CNPJ agora. Ele será conferido de novo ao criar a conta.',
    emailUnchecked:
      'Não conseguimos conferir o e-mail agora. Ele será conferido de novo ao criar a conta.',
  },
} as const;
