// Texts from the map screens of the design (.specs/front/previews/03-mapa-*).
// The spec fixes the CTA, the badges, the list states and the filter names
// (MAP-05, MAP-12, MAP-13, MAP-15, MAP-16, MAPF-01 to MAPF-04, Edge Cases).
export const mapDictionary = {
  metaTitle: 'Mapa de ONGs',
  mapLabel: 'Mapa de ONGs',
  // SPEC_DEVIATION: the spec doesn't name the cluster or the pins; simplest texts.
  clusterLabel: (count: number) => `${count} ONGs nesta área`,
  pinLabel: (name: string, openNow: boolean) =>
    `${name}, ${openNow ? 'aberta agora' : 'fechada agora'}`,
  preview: {
    cta: 'Ver ONG e animais',
    // SPEC_DEVIATION: MAP-05 asks for "horário de hoje" without a format.
    todayHours: (opensAt: string, closesAt: string) =>
      `Hoje, ${opensAt} às ${closesAt}`,
    closedToday: 'Fechada hoje',
    close: 'Fechar prévia',
  },
  list: {
    label: 'Lista de ONGs',
    title: (count: number) =>
      count === 1 ? '1 ONG perto de você' : `${count} ONGs perto de você`,
    radius: (km: number) => `Ordenadas pela distância · raio de ${km} km`,
    loading: 'Buscando ONGs perto de você…',
    truncated: 'Aproxime o mapa para ver todas as ONGs.',
    empty: {
      title: 'Nenhuma ONG cadastrada aqui ainda',
      description:
        'Tente aumentar a distância da busca ou procure em outra cidade.',
      widen: 'Ampliar raio',
      otherCity: 'Buscar outra cidade',
    },
    // SPEC_DEVIATION: MAPF-04 names only the action; simplest title and text.
    emptyFiltered: {
      title: 'Nenhuma ONG com esses filtros',
      description: 'Tire algum filtro para ver mais ONGs.',
      clear: 'Limpar filtros',
    },
    error: {
      title: 'Não conseguimos carregar as ONGs.',
      retry: 'Tentar de novo',
    },
  },
  filters: {
    label: 'Filtros',
    openNow: 'Aberta agora',
    radius: 'Distância',
    radiusOption: (km: number) => `Até ${km} km`,
    species: 'Animais',
    dogs: 'Com cães',
    cats: 'Com gatos',
    clear: 'Limpar filtros',
  },
  locationError: {
    title: 'Não encontramos sua localização',
    text: 'O GPS pode estar desligado ou o navegador bloqueou o acesso. Você ainda pode buscar pela cidade ou CEP.',
    retry: 'Tentar de novo',
    manual: 'Buscar pela cidade ou CEP',
  },
} as const;
