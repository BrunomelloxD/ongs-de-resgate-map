import type { DemoQuotas } from './demo.types';

// SPEC_DEVIATION: DEMO-02 doesn't define the page texts.
// Reason: simplest wording that explains the deletion and names each quota.
export const demoDictionary = {
  about: {
    metaTitle: 'Sobre a demonstração',
    title: 'Sobre a demonstração',
    deletion: (days: number) =>
      `Esta é uma demonstração. Cada ONG cadastrada aqui é apagada automaticamente ${days} dias depois do cadastro, junto com os animais e as fotos. As ONGs de exemplo não são apagadas.`,
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
  // DEMO-06. SPEC_DEVIATION: "falta 1 dia" in the singular; the spec only shows the plural.
  expiry: (date: string, days: number) =>
    `Seus dados serão apagados em ${date} — ${days === 1 ? 'falta 1 dia' : `faltam ${days} dias`}`,
} as const;
