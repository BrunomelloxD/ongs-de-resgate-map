// The spec fixes "Adicione pelo menos 1 foto." (AFORM-05), the default breed (AFORM-06),
// the photo rules and buttons (AFORM-07 to AFORM-11, DEMO-10 to DEMO-12), the delete
// dialog (AFORM-15) and its error (AFORM-16). Texts marked SPEC_DEVIATION aren't in it.
export const animalFormDictionary = {
  validation: {
    // SPEC_DEVIATION: AFORM-02/03/04 ask for an error on the field but give no text.
    name: 'Informe o nome, com até 60 caracteres.',
    species: 'Escolha a espécie.',
    sex: 'Escolha o sexo.',
    size: 'Escolha o porte.',
    ageValue: 'Informe a idade, um número de 0 a 30.',
    ageUnit: 'Escolha meses ou anos.',
    breed: 'A raça pode ter até 60 caracteres.',
    description: 'A descrição pode ter até 1000 caracteres.',
    photos: 'Adicione pelo menos 1 foto.',
  },
  upload: {
    /** AFORM-08, with N = MAX_UPLOAD_MB. */
    invalid: (mb: number) => `Envie JPG, PNG, WebP ou HEIC de até ${mb} MB.`,
    /** DEMO-11. */
    tooLarge: (mb: number) => `O arquivo passa de ${mb} MB.`,
    /** DEMO-12; the api's own 409 text wins when it sends one (DEMO-10). */
    storageFull:
      'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
    // SPEC_DEVIATION: AFORM-09 asks for an error on the photo but gives no text.
    failed: 'Não foi possível enviar a foto. Tente de novo.',
  },
  photos: {
    // SPEC_DEVIATION: heading, hint, cover badge, upload state, "Remover foto", the
    // photo labels and the announcements come from the design or are the simplest text.
    title: (count: number, max: number) => `Fotos (${count} de ${max})`,
    hint: (max: number, mb: number) =>
      `Até ${max} fotos, JPG, PNG, WebP ou HEIC de até ${mb} MB. A primeira é a capa. Arraste a foto ou use os botões para mudar a ordem.`,
    add: 'Adicionar foto',
    tooMany: (max: number) =>
      `Cabem até ${max} fotos. As que passaram do limite ficaram de fora.`,
    cover: 'Capa',
    useAsCover: 'Usar como capa',
    moveLeft: 'Mover para a esquerda',
    moveRight: 'Mover para a direita',
    remove: 'Remover foto',
    retry: 'Tentar de novo',
    uploading: 'Enviando…',
    /** Accessible name of each photo's group. */
    position: (n: number, total: number) => `Foto ${n} de ${total}`,
    alt: (n: number) => `Foto ${n} do animal`,
    moved: (n: number, total: number) =>
      `Foto movida para a posição ${n} de ${total}.`,
    madeCover: 'A foto agora é a capa.',
    removed: 'Foto removida.',
  },
  save: {
    // SPEC_DEVIATION: the spec doesn't define these; the quota (DEMO-09/10) and
    // "não encontrado" texts come from the api.
    failed: 'Não foi possível salvar o animal. Tente de novo.',
    invalid: 'Confira os campos e tente de novo.',
    photosInvalid: 'Confira as fotos e tente de novo.',
  },
  delete: {
    /** AFORM-16: bucket down (503); nothing was deleted. Also used for other failures. */
    failed: 'Não foi possível excluir agora. Tente de novo.',
    /** AFORM-15 */
    open: 'Excluir',
    title: (name: string) => `Excluir ${name}?`,
    // SPEC_DEVIATION: AFORM-15 only asks for the suggestion; wording from the design.
    description: (name: string) =>
      `${name} sai do mapa e da página da ONG, e as fotos são apagadas. Não dá para desfazer. Se ${name} foi adotado ou só não está disponível agora, você pode marcar como indisponível.`,
    markUnavailable: 'Marcar como indisponível',
    confirm: 'Excluir',
    cancel: 'Cancelar',
    /** Same texts as the dashboard switch (DASH-02, DASH-03). */
    markedUnavailable: (name: string) => `${name} agora está indisponível.`,
    markFailed: 'Não foi possível salvar. Tente de novo.',
  },
  form: {
    // SPEC_DEVIATION: labels, placeholders, options and buttons come from the design
    // (.specs/front/previews/10-*); the spec only fixes the fields (AFORM-01 to AFORM-06).
    errorSummaryTitle: 'Corrija para continuar',
    name: 'Nome',
    namePlaceholder: 'Ex.: Caramelo',
    species: 'Espécie',
    speciesOptions: { DOG: 'Cão', CAT: 'Gato', OTHER: 'Outro' },
    breed: 'Raça',
    sex: 'Sexo',
    sexOptions: { MALE: 'Macho', FEMALE: 'Fêmea' },
    size: 'Porte',
    sizeOptions: { SMALL: 'Pequeno', MEDIUM: 'Médio', LARGE: 'Grande' },
    ageValue: 'Idade estimada',
    ageUnit: 'Unidade',
    ageUnitOptions: { MONTHS: 'meses', YEARS: 'anos' },
    description: 'Descrição',
    descriptionPlaceholder: 'Personalidade, saúde, com quem convive…',
    counter: (n: number) => `${n}/1000 caracteres`,
    create: 'Salvar animal',
    update: 'Salvar alterações',
    saving: 'Salvando…',
    // SPEC_DEVIATION: saving with photos still uploading or failed isn't in the spec.
    waitUploads: 'Espere as fotos terminarem de enviar.',
    failedPhotos: 'Envie de novo ou remova as fotos com erro.',
  },
} as const;
