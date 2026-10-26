// Texts from the location screens of the design (.specs/front/previews/02-*, 03-mapa-erro-*).
// The spec fixes "Usar minha localização", "Tentar de novo", "Buscar pela cidade ou CEP"
// and the CEP messages (LOC-01, LOC-03, LOC-10, LOC-11).
export const locationDictionary = {
  metaTitle: 'Localização',
  // SPEC_DEVIATION: the figcraft's phone app bar (02-*, C-12) has no label for ←.
  back: 'Voltar para a página inicial',
  ask: {
    title: 'Onde você está?',
    lead: 'Para mostrar as ONGs mais perto, o mapa precisa saber sua região.',
    reasons: [
      'Só para centralizar o mapa nas ONGs perto de você.',
      'Não salvamos sua posição nem mostramos para as ONGs.',
      'Prefere não compartilhar? Busque por cidade ou CEP.',
    ],
    useLocation: 'Usar minha localização',
    manual: 'Buscar pela cidade ou CEP',
    promptHint: 'Em seguida, o navegador vai pedir sua permissão.',
    // SPEC_DEVIATION: the spec doesn't name the waiting state; simplest text.
    asking: 'Procurando sua localização…',
  },
  denied: {
    title: 'A localização está bloqueada',
    // LOC-05: how to turn the permission back on.
    text: 'Sem problema. Para ativar depois, toque no cadeado ao lado do endereço do site e permita “Localização”.',
    /** L-07: the desktop has no touch. */
    textDesktop:
      'Sem problema. Para ativar depois, clique no cadeado ao lado do endereço do site e permita “Localização”.',
  },
  unavailable: {
    title: 'Não encontramos sua localização',
    text: 'O GPS pode estar desligado ou demorou para responder. Você ainda pode buscar pela cidade ou CEP.',
  },
  retry: 'Tentar de novo',
  manual: {
    title: 'Busque pela cidade ou CEP',
    lead: 'Mostramos as ONGs num raio de 5 km do lugar que você escolher.',
    submit: 'Ver ONGs nesta região',
  },
  city: {
    label: 'Cidade',
    /** Figcraft 02-permissao-negada and 03-mapa-erro: one field for both. */
    labelWithCep: 'Cidade ou CEP',
    placeholder: 'Ex.: Campinas ou 13010-000',
    cityPrefix: 'Cidade · ',
    // SPEC_DEVIATION: the spec doesn't word these two; simplest texts.
    required: 'Digite uma cidade ou um CEP.',
    pick: 'Escolha uma cidade da lista.',
    // SPEC_DEVIATION: the spec doesn't define these two states; simplest texts.
    empty: 'Nenhuma cidade encontrada.',
    error: 'Não conseguimos buscar as cidades agora. Tente pelo CEP.',
  },
  cep: {
    pending: 'Buscando…',
    // SPEC_DEVIATION: the spec doesn't define the message for fewer than 8 digits.
    invalid: 'Digite os 8 números do CEP.',
    notFound: 'CEP não encontrado. Confira os números ou busque pela cidade.',
    unavailable: 'Não conseguimos buscar o CEP agora. Tente pela cidade.',
  },
} as const;
