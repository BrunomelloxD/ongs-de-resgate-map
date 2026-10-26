// The spec fixes the toggle label and messages (DASH-02, DASH-03, A11Y-07),
// "Cadastrar animal", "Cadastrar o primeiro animal" and the checklist items (DASH-06, DASH-07).
// The other texts come from the dashboard design (.specs/front/previews/09-painel-da-ong-*).
export const dashboardDictionary = {
  metaTitle: 'Seus animais',
  header: {
    // SPEC_DEVIATION: the spec doesn't name the area; text from the design.
    area: 'Área da ONG',
    // The spec doesn't name the link to /painel/perfil; the text comes from T170.
    profile: 'Perfil da ONG',
    logout: 'Sair',
    // SPEC_DEVIATION: the NGO area menu (T184) follows the figcraft (09-*); the
    // spec doesn't name its items, the menu button nor the navigation.
    animals: 'Animais',
    publicPage: 'Ver página pública',
    nav: 'Área da ONG',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
  },
  list: {
    title: 'Seus animais',
    // SPEC_DEVIATION: summary line from the design; not in the spec.
    summary: (total: number, available: number) =>
      `${total} ${total === 1 ? 'cadastrado' : 'cadastrados'} · ${available} ${available === 1 ? 'disponível' : 'disponíveis'} para adoção`,
    create: 'Cadastrar animal',
    search: 'Buscar',
    searchPlaceholder: 'Buscar pelo nome…',
    // SPEC_DEVIATION: the spec doesn't name the filter group; simplest label.
    filter: 'Mostrar',
    filters: {
      all: 'Todos',
      dogs: 'Cães',
      cats: 'Gatos',
      available: 'Disponíveis',
      unavailable: 'Indisponíveis',
    },
    // SPEC_DEVIATION: the spec doesn't define the empty search result.
    empty: 'Nenhum animal encontrado.',
  },
  row: {
    toggle: (name: string) => `Disponível para adoção: ${name}`,
    available: (name: string) => `${name} agora está disponível.`,
    unavailable: (name: string) => `${name} agora está indisponível.`,
    saveError: 'Não foi possível salvar. Tente de novo.',
    // SPEC_DEVIATION: icon-only link (A11Y-07); the spec doesn't fix the label.
    edit: (name: string) => `Editar ${name}`,
    speciesOptions: { DOG: 'Cão', CAT: 'Gato', OTHER: 'Outro' },
    sexOptions: { MALE: 'Macho', FEMALE: 'Fêmea' },
    sizeOptions: { SMALL: 'Pequeno', MEDIUM: 'Médio', LARGE: 'Grande' },
  },
  firstAccess: {
    // SPEC_DEVIATION: welcome title and text from the design; the spec fixes only the CTA and the checklist.
    title: (name: string) => `Boas-vindas, ${name}!`,
    description:
      'Cadastre o primeiro animal. Ele aparece no mapa e na página da ONG assim que você salvar.',
    cta: 'Cadastrar o primeiro animal',
    checklistTitle: 'Para a ONG aparecer bem no mapa',
    // SPEC_DEVIATION: item labels follow DASH-07 (imagem, horário, primeiro animal), worded like the design.
    items: {
      image: 'Imagem da ONG',
      hours: 'Horário de funcionamento',
      firstAnimal: 'Primeiro animal cadastrado',
    },
    // Screen-reader state of each item.
    done: 'feito',
    pending: 'pendente',
  },
  error: {
    // SPEC_DEVIATION: the spec doesn't define the dashboard error page.
    title: 'Não conseguimos carregar seus animais.',
    retry: 'Tentar novamente',
  },
} as const;
