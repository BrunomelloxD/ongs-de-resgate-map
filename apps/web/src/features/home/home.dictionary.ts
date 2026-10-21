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
  theme: { toDark: 'Usar tema escuro', toLight: 'Usar tema claro' },
} as const;
