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

// SPEC_DEVIATION: the footer texts are the figcraft's (01-boas-vindas), and the
// targets the simplest ones: "Para ONGs" opens the login.
export const SITE_TEXT = {
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
  ngo: '/entrar',
  privacy: '/privacidade',
  terms: '/termos',
  credits: '/sobre-a-demo',
} as const;

/**
 * T196: texts of the figcraft "Navbar" page (12-navbar-*). SPEC_DEVIATION:
 * HOME-01/HOME-03 name the link "Sou uma ONG"; the navbar the user approved
 * on 26/10/2026 has "Entrar" (same target, /entrar) and "Cadastrar minha ONG".
 * The figcraft doesn't word the menu dialog, the avatar link or the skip
 * link's target; simplest ones.
 */
export const NAVBAR_TEXT = {
  skip: 'Pular para o conteúdo',
  nav: 'Principal',
  map: 'Mapa de ONGs',
  howItWorks: 'Como funciona',
  forNgos: 'Para ONGs',
  login: 'Entrar',
  signup: 'Cadastrar minha ONG',
  ngoArea: 'Área da ONG',
  goToNgoArea: 'Ir para a Área da ONG',
  logout: 'Sair',
  openMenu: 'Abrir menu',
  closeMenu: 'Fechar menu',
  menu: 'Menu',
  aboutDemo: 'Sobre a demonstração',
  terms: 'Termos',
  privacy: 'Privacidade',
} as const;

/** Where the skip link lands: every page's `<main>` has this id. */
export const CONTENT_ID = 'conteudo';

export const NAVBAR_PATHS = {
  home: '/',
  map: '/localizacao',
  howItWorks: '/#como-funciona',
  forNgos: '/#para-ongs',
  login: '/entrar',
  signup: '/cadastro/sobre',
  ngoArea: '/painel',
  aboutDemo: '/sobre-a-demo',
  terms: '/termos',
  privacy: '/privacidade',
  /** Route Handler with the session state, read after hydration (SEC-03). */
  status: '/session/status',
} as const;
