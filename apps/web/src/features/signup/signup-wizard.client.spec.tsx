import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import {
  SIGNUP_STORAGE_KEY,
  SignupProvider,
  useSignup,
} from './components/signup-provider.client';
import type {
  CreateAccountError,
  SignupData,
  SignupSlug,
} from './signup.types';
import {
  SignupWizard,
  type AddressFieldsSlot,
  type HoursFieldsSlot,
  type SignupWizardProps,
} from './signup-wizard.client';
import { makeSignupData } from './test-fixtures';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const checks = vi.hoisted(() => ({
  checkCnpj: vi.fn(async () => ({ status: 'available' as const })),
  checkEmail: vi.fn(async () => ({ status: 'available' as const })),
}));
vi.mock('./actions/check-availability', () => checks);

const DEMO = { enabled: true, retentionDays: 7 };
const TERMS = 'Li e aceito os Termos de uso e a Política de privacidade.';
const DEMO_TEXT =
  'Entendi que esta é uma demonstração e que a ONG, os animais e as fotos serão apagados em 7 dias.';

/** Puts a wizard in memory, as the earlier steps would have left it. */
function Seed({ data, image }: { data: SignupData; image?: File }) {
  const { update, setImage } = useSignup();
  useEffect(() => {
    for (const step of Object.keys(data) as (keyof SignupData)[]) {
      update(step, data[step]);
    }
    if (image) setImage(image);
  }, [data, image, update, setImage]);
  return null;
}

interface Options extends Partial<SignupWizardProps> {
  data?: SignupData;
  image?: File;
}

function renderWizard(slug: SignupSlug, options: Options = {}) {
  const { data = makeSignupData(), image, ...props } = options;
  const addressSlots: AddressFieldsSlot[] = [];
  const hoursSlots: HoursFieldsSlot[] = [];
  const createAccount = vi.fn<SignupWizardProps['createAccount']>(
    async () => undefined,
  );
  const wizard = (current: SignupSlug) => (
    <SignupWizard
      slug={current}
      maxUploadMb={5}
      demo={DEMO}
      createAccount={createAccount}
      renderAddressFields={(slot) => {
        addressSlots.push(slot);
        return (
          <button type="button" onClick={() => slot.onChange({ number: '99' })}>
            Mudar número
          </button>
        );
      }}
      renderHoursFields={(slot) => {
        hoursSlots.push(slot);
        return <p>{slot.values.length} dias</p>;
      }}
      {...props}
    />
  );
  const view = render(
    <SignupProvider>
      <Seed data={data} image={image} />
      {wizard(slug)}
    </SignupProvider>,
  );
  const goTo = (next: SignupSlug) =>
    view.rerender(
      <SignupProvider>
        <Seed data={data} image={image} />
        {wizard(next)}
      </SignupProvider>,
    );
  return { createAccount, addressSlots, hoursSlots, goTo, view };
}

const acceptAndCreate = async () => {
  await userEvent.click(screen.getByRole('checkbox', { name: TERMS }));
  await userEvent.click(screen.getByRole('checkbox', { name: DEMO_TEXT }));
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('SignupWizard', () => {
  it.each([
    ['sobre', 'Sobre a ONG'],
    ['contato', 'Contato e acesso'],
    ['endereco', 'Endereço'],
    ['horario', 'Horário de funcionamento'],
    ['revisao', 'Revisão'],
  ] as const)('/cadastro/%s mostra a etapa "%s"', async (slug, title) => {
    renderWizard(slug);

    expect(
      await screen.findByRole('heading', { level: 1, name: title }),
    ).toBeVisible();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('SIGN-01: abrir uma etapa sem as anteriores válidas volta para a primeira pendente', async () => {
    const data = makeSignupData();
    data.address.location = null;
    renderWizard('revisao', { data });

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/cadastro/endereco'),
    );
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('"Ir para Contato" leva à etapa 2, com o que foi digitado guardado', async () => {
    renderWizard('sobre');
    const name = await screen.findByLabelText('Razão social');
    await userEvent.type(name, ' SP');
    expect(name).toHaveValue('Associação Protetora Patas do Bairro SP');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ir para Contato' }),
    );

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/cadastro/contato'),
    );
  });

  it('etapa 2: "Voltar" e "Ir para Endereço"', async () => {
    renderWizard('contato');
    const whatsapp = await screen.findByLabelText('WhatsApp');
    await userEvent.clear(whatsapp);
    await userEvent.type(whatsapp, '21987654321');
    expect(whatsapp).toHaveValue('(21) 98765-4321');

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(router.push).toHaveBeenLastCalledWith('/cadastro/sobre');
    await userEvent.click(
      screen.getByRole('button', { name: 'Ir para Endereço' }),
    );
    await waitFor(() =>
      expect(router.push).toHaveBeenLastCalledWith('/cadastro/endereco'),
    );
  });

  it('etapa 3: os campos recebem os valores, gravam no assistente, e "Ir para Horário" avança', async () => {
    const { addressSlots } = renderWizard('endereco');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Mudar número' }),
    );
    expect(addressSlots.at(-1)).toMatchObject({
      idPrefix: 'signup-address',
      errors: {},
      values: { number: '99', street: 'Rua Joaquim Távora' },
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Ir para Horário' }),
    );
    expect(router.push).toHaveBeenCalledWith('/cadastro/horario');
  });

  it('etapa 4: os campos recebem os 7 dias e gravam no assistente', async () => {
    const { hoursSlots } = renderWizard('horario');

    expect(await screen.findByText('7 dias')).toBeVisible();
    const slot = hoursSlots.at(-1)!;
    const closedAll = slot.values.map((d) => ({ ...d, closed: true }));
    act(() => slot.onChange(closedAll));
    expect(hoursSlots.at(-1)!.values.every((d) => d.closed)).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(router.push).toHaveBeenCalledWith('/cadastro/endereco');
    await userEvent.click(
      screen.getByRole('button', { name: 'Revisar cadastro' }),
    );
    expect(router.push).toHaveBeenCalledWith('/cadastro/revisao');
  });

  it('SIGN-28: "Criar conta" envia o assistente com o signupRequestId e a imagem guardada', async () => {
    const image = new File(['x'], 'logo.png', { type: 'image/png' });
    URL.createObjectURL = vi.fn(() => 'blob:ong');
    URL.revokeObjectURL = vi.fn();
    const { createAccount } = renderWizard('revisao', { image });

    await screen.findByRole('heading', { level: 1, name: 'Revisão' });
    await acceptAndCreate();

    expect(createAccount).toHaveBeenCalledTimes(1);
    const formData = createAccount.mock.calls[0]![0];
    const sent = JSON.parse(formData.get('data') as string) as Record<
      string,
      unknown
    >;
    const { signupRequestId } = JSON.parse(
      sessionStorage.getItem(SIGNUP_STORAGE_KEY)!,
    ) as { signupRequestId: string };
    expect(sent).toMatchObject({
      signupRequestId,
      about: { cnpj: '11.222.333/0001-81' },
      contact: { password: 'senha1234' },
      review: { termsAccepted: true, demoAccepted: true },
    });
    expect((formData.get('image') as File).name).toBe('logo.png');
    // The redirect to /painel answers nothing: the button stays pending.
    expect(
      screen.getByRole('button', { name: 'Criando a conta…' }),
    ).toBeDisabled();
  });

  it('depois da conta criada, sair do assistente apaga o sessionStorage', async () => {
    const { createAccount, view } = renderWizard('revisao');
    await screen.findByRole('heading', { level: 1, name: 'Revisão' });
    await acceptAndCreate();
    expect(createAccount).toHaveBeenCalled();
    expect(sessionStorage.getItem(SIGNUP_STORAGE_KEY)).not.toBeNull();

    view.unmount();

    expect(sessionStorage.getItem(SIGNUP_STORAGE_KEY)).toBeNull();
  });

  it('sair sem criar a conta mantém o sessionStorage', async () => {
    const { view } = renderWizard('revisao');
    await screen.findByRole('heading', { level: 1, name: 'Revisão' });

    view.unmount();

    expect(sessionStorage.getItem(SIGNUP_STORAGE_KEY)).not.toBeNull();
  });

  it('SIGN-31: e-mail em conflito leva à etapa 2 com o erro e os atalhos', async () => {
    const conflict: CreateAccountError = {
      ok: false,
      step: 'contato',
      field: 'email',
      error: 'Este e-mail já tem cadastro.',
    };
    const createAccount = vi.fn(async () => conflict);
    const { goTo } = renderWizard('revisao', { createAccount });
    await screen.findByRole('heading', { level: 1, name: 'Revisão' });

    await acceptAndCreate();
    expect(router.push).toHaveBeenCalledWith('/cadastro/contato');
    goTo('contato');

    expect(await screen.findByLabelText('E-mail')).toHaveAccessibleDescription(
      'Este e-mail já tem cadastro.',
    );
    expect(
      screen.getByRole('link', { name: 'Entrar com este e-mail' }),
    ).toBeVisible();
  });

  it('SIGN-31: CNPJ em conflito leva à etapa 1 com o erro, que some ao avançar', async () => {
    const SIGN_05 =
      'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.';
    const createAccount = vi.fn(async (): Promise<CreateAccountError> => ({
      ok: false,
      step: 'sobre',
      field: 'cnpj',
      error: SIGN_05,
    }));
    const { goTo } = renderWizard('revisao', { createAccount });
    await screen.findByRole('heading', { level: 1, name: 'Revisão' });
    await acceptAndCreate();
    goTo('sobre');

    expect(await screen.findByLabelText('CNPJ')).toHaveAccessibleDescription(
      expect.stringContaining(SIGN_05),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Ir para Contato' }),
    );
    await waitFor(() =>
      expect(router.push).toHaveBeenLastCalledWith('/cadastro/contato'),
    );
    goTo('contato');
    goTo('sobre');
    expect(await screen.findByLabelText('CNPJ')).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('erro sem etapa leva a uma etapa sem campo marcado', async () => {
    const createAccount = vi.fn(async (): Promise<CreateAccountError> => ({
      ok: false,
      step: 'endereco',
      error: 'Confira os dados desta etapa e tente de novo.',
    }));
    renderWizard('revisao', { createAccount });
    await screen.findByRole('heading', { level: 1, name: 'Revisão' });

    await acceptAndCreate();

    expect(router.push).toHaveBeenCalledWith('/cadastro/endereco');
  });

  it('DEMO-07: erro de cota fica na revisão, num alerta, e o botão volta', async () => {
    const DEMO_07 =
      'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.';
    const createAccount = vi.fn(async (): Promise<CreateAccountError> => ({
      ok: false,
      step: null,
      error: DEMO_07,
    }));
    renderWizard('revisao', { createAccount });
    await screen.findByRole('heading', { level: 1, name: 'Revisão' });

    await acceptAndCreate();

    expect(await screen.findByRole('alert')).toHaveTextContent(DEMO_07);
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('a chamada falhando (rede) mostra o erro genérico', async () => {
    const createAccount = vi.fn(async () => {
      throw new Error('offline');
    });
    renderWizard('revisao', { createAccount });
    await screen.findByRole('heading', { level: 1, name: 'Revisão' });

    await acceptAndCreate();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível criar a conta agora. Tente de novo.',
    );
  });
});
