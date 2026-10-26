// Texts from the welcome screen of the design (.specs/front/previews/01-boas-vindas-*).
// HOME-01 fixes the CTA and the NGO link; the rest follows the design.
export const homeDictionary = {
  brand: 'Animal Helper',
  ngoLink: 'Sou uma ONG',
  title: 'Adote perto de casa.',
  lead: 'Encontre ONGs da sua região num mapa, conheça os cães e gatos que elas cuidam e combine a adoção direto pelo WhatsApp.',
  cta: 'Encontrar ONGs perto de mim',
  privacy: 'Sem cadastro. Sua localização só centraliza o mapa e não é salva.',
  howItWorks: {
    title: 'Como funciona',
    subtitle: 'Três passos, sem criar conta.',
    steps: [
      {
        title: 'Encontre a ONG',
        text: 'O mapa mostra as ONGs perto de você, com horário e distância.',
      },
      {
        title: 'Conheça os animais',
        text: 'Veja fotos, idade, porte e o jeito de cada um antes de visitar.',
      },
      {
        title: 'Fale com a ONG',
        text: 'Um toque abre o WhatsApp da ONG com uma mensagem pronta sobre o animal.',
      },
    ],
  },
  // Illustration of the hero (figcraft 01): a sample "Card/ONG Lista" and, on the phone, its chip.
  sample: {
    name: 'Patas do Bairro',
    distance: '1,2 km',
    hours: 'Hoje, 9h às 18h',
  },
  forNgos: {
    title: 'Você cuida de animais resgatados?',
    text: 'Cadastre sua ONG de graça, publique os animais disponíveis e receba os interessados direto no seu WhatsApp.',
    /** Only on desktop, as in the figcraft. */
    more: 'Você mantém o perfil e liga ou desliga a disponibilidade de cada animal com um toque.',
    signup: 'Cadastrar minha ONG',
    login: 'Já tenho conta. Entrar',
  },
  /** PROF-08: after `?conta=excluida`. */
  accountDeleted: 'Conta excluída.',
  theme: { toDark: 'Usar tema escuro', toLight: 'Usar tema claro' },
} as const;
