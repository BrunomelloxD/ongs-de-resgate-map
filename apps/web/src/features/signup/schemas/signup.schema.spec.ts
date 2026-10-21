import {
  aboutSchema,
  addressSchema,
  contactSchema,
  hoursSchema,
  makeReviewSchema,
  type HoursInput,
} from './signup.schema';

// Valid CNPJs: numeric (11.222.333/0001-81) and alphanumeric (12.ABC.345/01DE-35).
const NUMERIC_CNPJ = '11.222.333/0001-81';
const ALPHANUMERIC_CNPJ = '12.ABC.345/01DE-35';

const about = (overrides: Record<string, unknown> = {}) => ({
  cnpj: NUMERIC_CNPJ,
  legalName: 'Patas do Bairro',
  description: 'a'.repeat(30),
  ...overrides,
});

const issues = (result: {
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) =>
  (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

describe('aboutSchema', () => {
  it('SIGN-03: aceita CNPJ numérico e alfanumérico com máscara e devolve a forma normalizada', () => {
    expect(aboutSchema.parse(about()).cnpj).toBe('11222333000181');
    expect(
      aboutSchema.parse(about({ cnpj: ALPHANUMERIC_CNPJ.toLowerCase() })).cnpj,
    ).toBe('12ABC34501DE35');
  });

  it.each(['11.222.333/0001-82', '12.ABC.345/01DE-36', '11.222.333/0001', ''])(
    'SIGN-04: CNPJ %j é recusado com a mensagem do spec',
    (cnpj) => {
      expect(issues(aboutSchema.safeParse(about({ cnpj })))).toEqual([
        {
          path: 'cnpj',
          message:
            'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.',
        },
      ]);
    },
  );

  it('SIGN-06: razão social vazia (ou só espaços) é recusada', () => {
    expect(issues(aboutSchema.safeParse(about({ legalName: '   ' })))).toEqual([
      { path: 'legalName', message: 'Informe a razão social.' },
    ]);
  });

  it('SIGN-06: razão social com 151 caracteres é recusada; com 150, aceita', () => {
    expect(
      issues(aboutSchema.safeParse(about({ legalName: 'a'.repeat(151) }))),
    ).toEqual([
      {
        path: 'legalName',
        message: 'A razão social pode ter até 150 caracteres.',
      },
    ]);
    expect(
      aboutSchema.safeParse(about({ legalName: 'a'.repeat(150) })).success,
    ).toBe(true);
  });

  it.each([29, 601])(
    'SIGN-08: descrição com %i caracteres é recusada',
    (length) => {
      expect(
        issues(
          aboutSchema.safeParse(about({ description: 'a'.repeat(length) })),
        ),
      ).toEqual([
        {
          path: 'description',
          message: 'A descrição precisa ter de 30 a 600 caracteres.',
        },
      ]);
    },
  );

  it.each([30, 600])(
    'SIGN-08: descrição com %i caracteres é aceita',
    (length) => {
      expect(
        aboutSchema.safeParse(about({ description: 'a'.repeat(length) }))
          .success,
      ).toBe(true);
    },
  );
});

const contact = (overrides: Record<string, unknown> = {}) => ({
  email: 'contato@patas.org',
  whatsapp: '(11) 98765-4321',
  password: 'senha1234',
  confirmation: 'senha1234',
  ...overrides,
});

describe('contactSchema', () => {
  it('SIGN-13: grava o WhatsApp como 55 + DDD + número, só com dígitos', () => {
    expect(contactSchema.parse(contact()).whatsapp).toBe('5511987654321');
  });

  it('SIGN-14: aceita o fixo com 10 dígitos (edge case)', () => {
    expect(
      contactSchema.parse(contact({ whatsapp: '(11) 3456-7890' })).whatsapp,
    ).toBe('551134567890');
  });

  it.each(['(20) 98765-4321', '(11) 9876-543', '(11) 98765-43210'])(
    'SIGN-14: WhatsApp %j é recusado',
    (whatsapp) => {
      expect(issues(contactSchema.safeParse(contact({ whatsapp })))).toEqual([
        {
          path: 'whatsapp',
          message: 'Informe o WhatsApp com DDD, como (11) 98765-4321.',
        },
      ]);
    },
  );

  it.each(['contato', 'contato@', '@patas.org'])(
    'SIGN-11: e-mail %j é recusado',
    (email) => {
      expect(issues(contactSchema.safeParse(contact({ email })))).toEqual([
        {
          path: 'email',
          message: 'Informe um e-mail válido, como nome@ong.org.',
        },
      ]);
    },
  );

  it('SIGN-11: o e-mail chega sem os espaços das pontas', () => {
    expect(
      contactSchema.parse(contact({ email: ' contato@patas.org ' })).email,
    ).toBe('contato@patas.org');
  });

  it.each([
    ['senha12', 'A senha precisa de 8 ou mais caracteres.'],
    ['12345678', 'A senha precisa de ao menos uma letra.'],
    ['senhasemnumero', 'A senha precisa de ao menos um número.'],
  ])('SIGN-15: senha %j é recusada com "%s"', (password, message) => {
    expect(
      issues(
        contactSchema.safeParse(contact({ password, confirmation: password })),
      ),
    ).toEqual([{ path: 'password', message }]);
  });

  it('SIGN-16: confirmação diferente é recusada com "As senhas não conferem."', () => {
    expect(
      issues(contactSchema.safeParse(contact({ confirmation: 'senha12345' }))),
    ).toEqual([{ path: 'confirmation', message: 'As senhas não conferem.' }]);
  });
});

const address = (overrides: Record<string, unknown> = {}) => ({
  cep: '04101-300',
  street: 'Rua Vergueiro',
  number: '3000',
  complement: '',
  district: 'Vila Mariana',
  city: 'São Paulo',
  uf: 'SP',
  location: {
    lat: -23.5869,
    lng: -46.6347,
    confirmedAt: '2026-10-20T12:00:00.000Z',
  },
  ...overrides,
});

describe('addressSchema', () => {
  it('aceita o endereço completo com a localização confirmada, com o CEP só com dígitos', () => {
    expect(addressSchema.parse(address())).toEqual({
      ...address(),
      cep: '04101300',
      complement: null,
    });
  });

  it('SIGN-22: sem "Confirmar localização" bloqueia o avanço', () => {
    expect(
      issues(addressSchema.safeParse(address({ location: null }))),
    ).toEqual([
      {
        path: 'location',
        message: 'Confirme a localização no mapa para continuar.',
      },
    ]);
  });

  it('campos obrigatórios vazios e UF fora da lista são recusados no campo', () => {
    expect(
      issues(
        addressSchema.safeParse(
          address({
            cep: '0410130',
            street: '',
            number: ' ',
            district: '',
            city: '',
            uf: 'XX',
            complement: 'a'.repeat(61),
          }),
        ),
      ),
    ).toEqual([
      { path: 'cep', message: 'Digite os 8 números do CEP.' },
      { path: 'street', message: 'Informe o logradouro (até 150 caracteres).' },
      { path: 'number', message: 'Informe o número (até 10 caracteres).' },
      {
        path: 'complement',
        message: 'O complemento pode ter até 60 caracteres.',
      },
      { path: 'district', message: 'Informe o bairro (até 80 caracteres).' },
      { path: 'city', message: 'Informe a cidade (até 80 caracteres).' },
      { path: 'uf', message: 'Escolha a UF.' },
    ]);
  });
});

const week = (
  monday: Partial<HoursInput['openingHours'][number]> = {},
): HoursInput => ({
  openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 0,
    opensAt: '09:00',
    closesAt: '18:00',
    ...(dayOfWeek === 1 ? monday : {}),
  })),
});

describe('hoursSchema', () => {
  it('SIGN-23: aceita os 7 dias; o dia fechado vai sem horários', () => {
    const parsed = hoursSchema.parse(week());

    expect(parsed.openingHours[0]).toEqual({
      dayOfWeek: 0,
      closed: true,
      opensAt: null,
      closesAt: null,
    });
    expect(parsed.openingHours[1]).toEqual({
      dayOfWeek: 1,
      closed: false,
      opensAt: '09:00',
      closesAt: '18:00',
    });
  });

  it.each([
    ['igual', '09:00'],
    ['anterior', '08:59'],
  ])(
    'SIGN-25: fechamento %s à abertura bloqueia com a mensagem do spec',
    (_case, closesAt) => {
      expect(issues(hoursSchema.safeParse(week({ closesAt })))).toEqual([
        {
          path: 'openingHours.1.closesAt',
          message: 'O horário de fechamento deve ser depois da abertura.',
        },
      ]);
    },
  );

  it('SIGN-25: um dia fechado não confere os horários', () => {
    expect(
      hoursSchema.safeParse(week({ closed: true, closesAt: '08:00' })).success,
    ).toBe(true);
  });

  it.each([
    { opensAt: '' },
    { opensAt: null },
    { closesAt: null },
    { closesAt: '24:00' },
  ])('dia aberto sem horário no formato HH:MM (%j) é recusado', (monday) => {
    expect(issues(hoursSchema.safeParse(week(monday)))).toEqual([
      {
        path: 'openingHours.1.opensAt',
        message: 'Informe a abertura e o fechamento no formato HH:MM.',
      },
    ]);
  });
});

describe('makeReviewSchema', () => {
  it('SIGN-27: sem o aceite dos termos a revisão é recusada', () => {
    expect(
      issues(
        makeReviewSchema({ demoMode: false }).safeParse({
          termsAccepted: false,
          demoAccepted: false,
        }),
      ),
    ).toEqual([
      {
        path: 'termsAccepted',
        message:
          'Aceite os Termos de uso e a Política de privacidade para criar a conta.',
      },
    ]);
  });

  it('DEMO-03: com demo, a revisão exige o aceite da demo', () => {
    const schema = makeReviewSchema({ demoMode: true });

    expect(
      issues(schema.safeParse({ termsAccepted: true, demoAccepted: false })),
    ).toEqual([
      {
        path: 'demoAccepted',
        message: 'Marque que você entendeu que esta é uma demonstração.',
      },
    ]);
    expect(
      schema.safeParse({ termsAccepted: true, demoAccepted: true }).success,
    ).toBe(true);
  });

  it('DEMO-20: sem demo, o aceite da demo não é exigido', () => {
    expect(
      makeReviewSchema({ demoMode: false }).safeParse({
        termsAccepted: true,
        demoAccepted: false,
      }).success,
    ).toBe(true);
  });
});
