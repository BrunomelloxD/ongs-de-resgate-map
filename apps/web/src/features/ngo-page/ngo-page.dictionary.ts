// Texts from the NGO page of the design (.specs/front/previews/04-pagina-da-ong-*).
// The spec fixes "Como chegar", "Só disponíveis", "Indisponível", the empty
// filtered state and the 404 title (NGO-01, NGO-04, NGO-05, NGO-07, NGO-09, NGO-11).
export const ngoPageDictionary = {
  profile: {
    whatsapp: 'Falar com a ONG no WhatsApp',
    address: 'Endereço',
    // SPEC_DEVIATION: the spec doesn't name the mini map; simplest label.
    miniMapLabel: (name: string) => `Localização da ${name}`,
    miniMapCluster: (count: number) => `${count} ONGs nesta área`,
    directions: 'Como chegar',
    newTab: '(abre em nova aba)',
    hours: 'Horário de funcionamento',
    today: 'hoje',
    // SPEC_DEVIATION: NGO-01 asks for the 7 days without a format; same as the map.
    dayHours: (opensAt: string, closesAt: string) =>
      `${opensAt} às ${closesAt}`,
    closed: 'Fechada',
    // SPEC_DEVIATION: figcraft 04 (O-03) has "Fecha às 18h · 1,2 km de você"; the
    // distance needs the visitor's position, which this page never gets (SEC-01).
    closesAt: (time: string) => `Fecha às ${time}`,
    // SPEC_DEVIATION: the figcraft has no label for ← on the cover; simplest one.
    back: 'Voltar',
    days: [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ],
  },
  animals: {
    title: 'Animais para adoção',
    filters: 'Filtros',
    species: 'Espécie',
    sex: 'Sexo',
    size: 'Porte',
    onlyAvailable: 'Só disponíveis',
    clear: 'Limpar filtros',
    speciesOptions: { DOG: 'Cão', CAT: 'Gato', OTHER: 'Outro' },
    sexOptions: { MALE: 'Macho', FEMALE: 'Fêmea' },
    sizeOptions: { SMALL: 'Pequeno', MEDIUM: 'Médio', LARGE: 'Grande' },
    // SPEC_DEVIATION: NGO-08 asks for an invitation without the text; figcraft 04 (O-07).
    emptyNgo: {
      title: (name: string) => `A ${name} ainda não cadastrou animais`,
      description:
        'Fale com a ONG pelo WhatsApp para saber quem está esperando um lar.',
      ask: 'Perguntar no WhatsApp',
    },
    // SPEC_DEVIATION: the spec doesn't count the animals; figcraft 04 (O-05).
    count: (total: number, available: number) =>
      `${total === 1 ? '1 animal' : `${total} animais`} · ${
        available === 1
          ? '1 disponível agora'
          : `${available} disponíveis agora`
      }`,
    allSpecies: 'Todas as espécies',
    allSexes: 'Todos os sexos',
    allSizes: 'Todos os portes',
    emptyFiltered: {
      title: 'Nenhum animal com esses filtros.',
      // SPEC_DEVIATION: NGO-09 fixes only the title and the action.
      description: 'Tire algum filtro para ver mais animais.',
    },
    pagination: {
      label: 'Páginas de animais',
      previous: 'Anterior',
      next: 'Próxima',
      summary: (page: number, lastPage: number) =>
        `Página ${page} de ${lastPage}`,
    },
  },
  notFound: {
    title: 'ONG não encontrada',
    description: 'O link pode estar errado, ou a ONG saiu do Animal Helper.',
    map: 'Ver o mapa de ONGs',
  },
  error: {
    title: 'Não conseguimos carregar a ONG.',
    retry: 'Tentar novamente',
  },
} as const;
