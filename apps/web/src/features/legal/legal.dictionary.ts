export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface LegalText {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
}

// SPEC_DEVIATION: the spec doesn't define the legal text.
// Reason: short demo text that only states what SEC-01 to SEC-08 and DEMO already guarantee.
const terms: LegalText = {
  title: 'Termos de uso',
  intro:
    'O Animal Helper é uma demonstração que liga ONGs de proteção animal a pessoas que querem adotar. Ao usar o site, você concorda com estes termos.',
  sections: [
    {
      heading: 'Demonstração',
      paragraphs: [
        'Os dados cadastrados por ONGs são apagados automaticamente no prazo indicado na faixa da demonstração. As ONGs de exemplo não são apagadas.',
        'O serviço pode ficar fora do ar ou mudar sem aviso.',
      ],
    },
    {
      heading: 'Responsabilidade da ONG',
      paragraphs: [
        'A ONG garante que os dados, as fotos e as descrições publicados são verdadeiros e que tem o direito de usar as fotos enviadas.',
        'A adoção é combinada direto entre a pessoa interessada e a ONG, pelo WhatsApp. O Animal Helper não participa da adoção.',
      ],
    },
    {
      heading: 'Conta',
      paragraphs: [
        'A ONG pode editar o perfil e excluir a conta a qualquer momento pelo painel. A exclusão apaga a ONG, os animais e as fotos.',
      ],
    },
  ],
};

const privacy: LegalText = {
  title: 'Política de privacidade',
  intro:
    'Esta política explica quais dados o Animal Helper trata e por quê, conforme a LGPD.',
  sections: [
    {
      heading: 'Visitantes',
      paragraphs: [
        'Sua localização é usada só no seu navegador para mostrar as ONGs perto de você. Ela não é enviada ao nosso servidor nem guardada.',
        'Não usamos cookies de analytics nem de terceiros, e quem só visita o site não recebe nenhum cookie.',
      ],
    },
    {
      heading: 'ONGs',
      paragraphs: [
        'Guardamos os dados do cadastro: razão social, CNPJ, descrição, e-mail, WhatsApp, endereço, horários, fotos e a senha, que fica só como hash.',
        'O e-mail e o CNPJ não aparecem nas páginas públicas. O nome, a descrição, o endereço, o WhatsApp, os horários e as fotos ficam públicos para quem procura uma ONG.',
        'Removemos os metadados das fotos, incluindo a localização GPS.',
        'A sessão usa um único cookie necessário para manter a ONG conectada.',
      ],
    },
    {
      heading: 'Exclusão',
      paragraphs: [
        'Na demonstração, os dados das ONGs são apagados automaticamente. A ONG também pode excluir a conta pelo painel a qualquer momento.',
      ],
    },
  ],
};

export const legalDictionary = {
  version: (version: string) => `Versão ${version}`,
  terms,
  privacy,
} as const;
