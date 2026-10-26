// Texts from the login and password screens of the design (.specs/front/previews/06-*, 08-*).
// The spec fixes the links (AUTH-01) and the messages of AUTH-03, AUTH-04, AUTH-08,
// AUTH-11, AUTH-12, AUTH-13 and SIGN-16.
export const authDictionary = {
  brand: 'Animal Helper',
  // Phrase of the green panel of the login and recovery screens (desktop).
  panelPhrase:
    'Cada animal que você cadastra aparece no mapa para quem quer adotar perto de casa.',
  // SPEC_DEVIATION: the spec doesn't define the field validation texts nor the
  // generic error for an unexpected api answer; simplest texts.
  fields: {
    email: 'E-mail',
    password: 'Senha',
    emailInvalid: 'Informe um e-mail válido, como nome@ong.org.',
    passwordRequired: 'Informe a senha.',
  },
  login: {
    metaTitle: 'Entrar',
    title: 'Entrar na área da ONG',
    lead: 'Atualize o perfil da ONG e os animais disponíveis para adoção.',
    submit: 'Entrar',
    pending: 'Entrando…',
    forgot: 'Esqueci minha senha',
    noAccount: 'Ainda não tem conta?',
    signup: 'Cadastrar minha ONG',
    passwordChanged: 'Senha alterada. Entre com a nova senha.',
    invalid: 'E-mail ou senha incorretos.',
    tooMany: 'Muitas tentativas. Tente de novo em 15 minutos.',
    unavailable: 'Não foi possível entrar agora. Tente de novo.',
  },
  forgot: {
    metaTitle: 'Recuperar senha',
    title: 'Recuperar senha',
    lead: 'Informe o e-mail da conta. Enviamos um link para você criar uma nova senha.',
    submit: 'Enviar link',
    pending: 'Enviando…',
    backToLogin: 'Voltar para o login',
    sent: 'Se houver uma conta com este e-mail, enviamos um link.',
    sentTitle: 'Confira seu e-mail',
    sentHint: 'O link vale por 1 hora. Olhe também a caixa de spam.',
    notArrived: 'Não chegou?',
    resend: 'Reenviar',
    /** AUTH-10: `time` as m:ss, like the design. */
    resendIn: (time: string) => `Reenviar em ${time}`,
    tooMany: 'Muitos pedidos. Tente de novo em 1 hora.',
    // SPEC_DEVIATION: the spec doesn't define the generic error.
    unavailable: 'Não foi possível enviar o link agora. Tente de novo.',
  },
  reset: {
    metaTitle: 'Nova senha',
    title: 'Criar nova senha',
    lead: 'Escolha uma senha nova para entrar na área da ONG.',
    password: 'Nova senha',
    confirmation: 'Confirme a nova senha',
    rulesTitle: 'A senha precisa ter:',
    ruleMet: 'atendida',
    ruleUnmet: 'não atendida',
    submit: 'Salvar nova senha',
    pending: 'Salvando…',
    linkGone: 'Este link expirou ou já foi usado.',
    requestAnother: 'Pedir outro link',
    // SPEC_DEVIATION: the spec doesn't define the lead texts nor the generic error.
    unavailable: 'Não foi possível trocar a senha agora. Tente de novo.',
  },
  // SPEC_DEVIATION: the spec doesn't define the error summary title.
  errorSummaryTitle: 'Corrija para continuar',
  back: 'Voltar',
} as const;
