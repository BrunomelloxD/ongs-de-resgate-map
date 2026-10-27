import type { DemoQuotas } from './demo.types';

// SPEC_DEVIATION: DEMO-02 doesn't define the page texts.
// Reason: simplest wording that explains the deletion and names each quota.
export const demoDictionary = {
  about: {
    metaTitle: 'Sobre a demonstração',
    title: 'Sobre a demonstração',
    deletion: (days: number) =>
      `Esta é uma demonstração. Cada ONG cadastrada aqui é apagada automaticamente ${days} dias depois do cadastro, junto com os animais e as fotos. As ONGs de exemplo não são apagadas.`,
    // DEP-63: the locked demo (AD-008).
    locked:
      'Esta é uma demonstração fechada: não é possível cadastrar ONGs. Entre com a conta de demonstração, mostrada na tela de login, para conhecer o painel. Os animais cadastrados nela são apagados todos os dias; as ONGs de exemplo não são apagadas.',
    disabled:
      'O modo demonstração está desligado: nada é apagado automaticamente e os limites abaixo não se aplicam.',
    limitsTitle: 'Limites da demonstração',
    retention: 'Dias até a exclusão automática',
    quotas: {
      maxNgos: 'ONGs cadastradas ao mesmo tempo',
      signupsPerIpPerDay: 'Cadastros por rede a cada 24 horas',
      maxAnimalsPerNgo: 'Animais por ONG',
      maxImagesPerAnimal: 'Fotos por animal',
      maxUploadMb: 'Tamanho máximo de cada arquivo (MB)',
      maxStorageMb: 'Armazenamento total da demonstração (MB)',
    } satisfies Record<keyof DemoQuotas, string>,
    creditsTitle: 'Créditos das fotos de exemplo',
    by: (creator: string) => `por ${creator}`,
    license: (license: string) => `Licença: ${license}`,
  },
  // AD-008 (DEP-19, DEP-20): the text the api answers with its 403.
  locked: {
    title: 'Indisponível na demo.',
    text: 'Nesta demonstração você pode ver esta tela, mas não enviar. Entre com a conta de demonstração para cadastrar animais.',
  },
  // DEP-18. SPEC_DEVIATION: the spec doesn't define the card texts.
  account: {
    title: 'Conta de demonstração',
    text: 'Use estes dados para entrar no painel. Os animais cadastrados são apagados todos os dias.',
    email: 'E-mail',
    password: 'Senha',
  },
  // DEMO-06. SPEC_DEVIATION: "falta 1 dia" in the singular; the spec only shows the plural.
  expiry: (date: string, days: number) =>
    `Seus dados serão apagados em ${date} — ${days === 1 ? 'falta 1 dia' : `faltam ${days} dias`}`,
} as const;
