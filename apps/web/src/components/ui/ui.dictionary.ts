// Texts of the shared components; plain module, so the E2E Page Objects can import it.
/** SHARE-01 to SHARE-03. */
export const SHARE_TEXT = {
  label: 'Compartilhar',
  copied: 'Link copiado.',
  // SPEC_DEVIATION: SHARE-03 doesn't name the field; simplest label.
  field: 'Link da página',
} as const;

// SPEC_DEVIATION: the spec doesn't word the eye button of the password fields.
// Reason: simplest label; aria-pressed tells whether the password is showing.
export const PASSWORD_INPUT_TEXT = {
  show: 'Mostrar senha',
} as const;

/** DIRTY-01. */
export const UNSAVED_CHANGES_TEXT = {
  title: 'Sair sem salvar?',
  // SPEC_DEVIATION: DIRTY-01 fixes the title and the actions, not the description.
  description: 'As alterações feitas aqui ainda não foram salvas.',
  stay: 'Continuar editando',
  leave: 'Sair',
} as const;

/** Wordmark of the Logo. */
export const BRAND_NAME = 'Animal Helper';

// SPEC_DEVIATION: HOME-02 names only "Sou uma ONG"; the other header and footer
// texts are the figcraft's (01-boas-vindas), and the targets the simplest ones:
// "Mapa de ONGs" asks for the location first, "Para ONGs" opens the login.
export const SITE_TEXT = {
  nav: 'Principal',
  howItWorks: 'Como funciona',
  map: 'Mapa de ONGs',
  ngo: 'Sou uma ONG',
  footerNav: 'Rodapé',
  forNgos: 'Para ONGs',
  privacy: 'Privacidade',
  terms: 'Termos',
  credits: 'Créditos das fotos',
  description:
    'Um mapa das ONGs que resgatam e cuidam de animais, para quem quer adotar perto de casa.',
  photoCredits: 'Fotos: Wikimedia Commons (CC0, CC BY e CC BY-SA).',
} as const;

export const SITE_PATHS = {
  home: '/',
  howItWorks: '/#como-funciona',
  map: '/localizacao',
  ngo: '/entrar',
  privacy: '/privacidade',
  terms: '/termos',
  credits: '/sobre-a-demo',
} as const;
