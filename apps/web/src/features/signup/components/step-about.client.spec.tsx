import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { AboutValues, AvailabilityResult } from '../signup.types';
import { StepAbout } from './step-about.client';

const VALID: AboutValues = {
  cnpj: '11.222.333/0001-81',
  legalName: 'Patas do Bairro',
  description: 'Resgatamos cães e gatos abandonados na Zona Sul.',
};
const SIGN_04 =
  'CNPJ inválido. Confira os 14 caracteres: os dois últimos são dígitos verificadores.';
const SIGN_05 =
  'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.';
const SIGN_10 = 'Envie JPG, PNG ou WebP de até 5 MB.';

interface Options {
  values?: Partial<AboutValues>;
  serverError?: string;
  check?: AvailabilityResult | Promise<AvailabilityResult>;
}

/** Keeps the values like the SignupProvider does. */
function renderStep({
  values = {},
  check = { status: 'available' },
  serverError,
}: Options = {}) {
  const checkCnpj = vi.fn(async (_cnpj: string) => check);
  const onContinue = vi.fn();
  const onImageChange = vi.fn();

  function Harness() {
    const [state, setState] = useState({ ...VALID, ...values });
    const [image, setImage] = useState<File | null>(null);
    return (
      <StepAbout
        values={state}
        onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
        image={image}
        onImageChange={(file) => {
          onImageChange(file);
          setImage(file);
        }}
        maxUploadMb={5}
        checkCnpj={checkCnpj}
        onContinue={onContinue}
        serverError={serverError}
      />
    );
  }

  render(<Harness />);
  return { checkCnpj, onContinue, onImageChange };
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Ir para Contato' }));
const cnpj = () => screen.getByLabelText('CNPJ');

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('StepAbout', () => {
  it('SIGN-31: o erro do envio final chega a uma etapa já montada e a próxima tentativa confere o CNPJ de novo', async () => {
    const checkCnpj = vi.fn(
      async (_cnpj: string): Promise<AvailabilityResult> => ({
        status: 'available',
      }),
    );
    const props = {
      values: VALID,
      onChange: vi.fn(),
      image: null,
      onImageChange: vi.fn(),
      maxUploadMb: 5,
      checkCnpj,
      onContinue: vi.fn(),
    };
    const { rerender } = render(<StepAbout {...props} />);
    await submit();
    expect(checkCnpj).toHaveBeenCalledTimes(1);

    rerender(<StepAbout {...props} serverError={SIGN_05} />);

    expect(cnpj()).toHaveAttribute('aria-invalid', 'true');
    expect(cnpj()).toHaveAccessibleDescription(
      expect.stringContaining(SIGN_05),
    );
    await submit();
    expect(checkCnpj).toHaveBeenCalledTimes(2);
  });

  it('SIGN-31: CNPJ que passou a existir no envio final aparece no campo ao voltar', () => {
    renderStep({ serverError: SIGN_05 });

    expect(cnpj()).toHaveAttribute('aria-invalid', 'true');
    expect(cnpj()).toHaveAccessibleDescription(
      expect.stringContaining(SIGN_05),
    );
  });

  it('SIGN-07: o contador mostra "42/600" e acompanha a digitação', async () => {
    renderStep({ values: { description: 'a'.repeat(41) } });

    await userEvent.type(screen.getByLabelText('Descrição'), 'b');

    expect(screen.getByText('42/600')).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toHaveAccessibleDescription(
      '42/600',
    );
  });

  it('SIGN-03: aplica a máscara ao digitar, com letras nas 12 primeiras posições', async () => {
    renderStep({ values: { cnpj: '' } });

    await userEvent.type(cnpj(), '12abc34501de35');

    expect(cnpj()).toHaveValue('12.ABC.345/01DE-35');
  });

  it('dados válidos e CNPJ livre: confere o CNPJ normalizado e continua', async () => {
    const { checkCnpj, onContinue } = renderStep();

    await submit();

    expect(checkCnpj).toHaveBeenCalledWith('11222333000181');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('SIGN-05: CNPJ duplicado ao sair do campo mostra o erro e bloqueia "Continuar"', async () => {
    const { checkCnpj, onContinue } = renderStep({
      check: { status: 'taken', error: SIGN_05 },
    });

    await userEvent.click(cnpj());
    await userEvent.tab();

    expect(await screen.findByText(SIGN_05)).toBeInTheDocument();
    expect(cnpj()).toHaveAccessibleDescription(
      expect.stringContaining(SIGN_05),
    );

    await submit();

    expect(onContinue).not.toHaveBeenCalled();
    // Blur and submit share one call for the same CNPJ.
    expect(checkCnpj).toHaveBeenCalledTimes(1);
    const summary = screen.getByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary).getByRole('link', { name: SIGN_05 }),
    ).toHaveAttribute('href', '#signup-cnpj');
    await waitFor(() => expect(cnpj()).toHaveFocus());
  });

  it('SIGN-04: CNPJ inválido bloqueia o avanço com a mensagem do spec, sem chamar a api', async () => {
    const { checkCnpj, onContinue } = renderStep({
      values: { cnpj: '11.222.333/0001-82' },
    });

    await userEvent.click(cnpj());
    await userEvent.tab();
    await submit();

    expect(checkCnpj).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
    expect(cnpj()).toHaveAccessibleDescription(
      expect.stringContaining(SIGN_04),
    );
    await waitFor(() => expect(cnpj()).toHaveFocus());
  });

  it('corrigir o CNPJ apaga o erro do campo', async () => {
    renderStep({ check: { status: 'taken', error: SIGN_05 } });

    await submit();
    expect(await screen.findAllByText(SIGN_05)).toHaveLength(2);

    await userEvent.type(cnpj(), '1');

    expect(screen.queryByText(SIGN_05)).not.toBeInTheDocument();
  });

  it('a resposta de um CNPJ antigo não aparece depois que a ONG digita outro', async () => {
    let answer: (result: AvailabilityResult) => void = () => undefined;
    renderStep({
      check: new Promise<AvailabilityResult>((resolve) => (answer = resolve)),
    });

    await userEvent.click(cnpj());
    await userEvent.tab();
    await userEvent.type(cnpj(), '{backspace}');
    answer({ status: 'taken', error: SIGN_05 });

    await waitFor(() =>
      expect(screen.queryByText(SIGN_05)).not.toBeInTheDocument(),
    );
  });

  it('429 ou api fora: mostra o aviso e deixa continuar', async () => {
    const notice =
      'Não conseguimos conferir o CNPJ agora. Ele será conferido de novo ao criar a conta.';
    const { onContinue } = renderStep({
      check: { status: 'unchecked', error: notice },
    });

    await userEvent.click(cnpj());
    await userEvent.tab();
    expect(await screen.findByText(notice)).toBeInTheDocument();

    await submit();

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('enquanto confere o CNPJ no envio, o botão fica desabilitado', async () => {
    renderStep({ check: new Promise<AvailabilityResult>(() => undefined) });

    await submit();

    expect(
      await screen.findByRole('button', { name: 'Conferindo o CNPJ…' }),
    ).toBeDisabled();
  });

  it('SIGN-06, SIGN-08: razão social vazia e descrição curta aparecem no resumo e nos campos', async () => {
    const { onContinue } = renderStep({
      values: { legalName: '', description: 'curta' },
    });

    await submit();

    const summary = await screen.findByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual([
      'Informe a razão social.',
      'A descrição precisa ter de 30 a 600 caracteres.',
    ]);
    expect(screen.getByLabelText('Razão social')).toHaveAccessibleDescription(
      'Informe a razão social.',
    );
    expect(onContinue).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByLabelText('Razão social')).toHaveFocus(),
    );

    await userEvent.type(screen.getByLabelText('Razão social'), 'Patas');

    expect(
      screen.getByLabelText('Razão social'),
    ).not.toHaveAccessibleDescription();
  });

  it('SIGN-10: GIF é recusado com a mensagem do spec e não é guardado', async () => {
    const { onImageChange } = renderStep();

    await userEvent.upload(
      screen.getByLabelText('Logo ou foto da ONG'),
      new File(['gif'], 'logo.gif', { type: 'image/gif' }),
      { applyAccept: false },
    );

    expect(screen.getByText(SIGN_10)).toBeInTheDocument();
    expect(
      screen.getByLabelText('Logo ou foto da ONG'),
    ).toHaveAccessibleDescription(expect.stringContaining(SIGN_10));
    expect(onImageChange).not.toHaveBeenCalled();
  });

  it('SIGN-10: PNG acima de 5 MB é recusado', async () => {
    const { onImageChange } = renderStep();

    await userEvent.upload(
      screen.getByLabelText('Logo ou foto da ONG'),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', {
        type: 'image/png',
      }),
    );

    expect(screen.getByText(SIGN_10)).toBeInTheDocument();
    expect(onImageChange).not.toHaveBeenCalled();
  });

  it('SIGN-09: PNG válido é guardado e aparece em prévia quadrada; dá para trocar e remover', async () => {
    const { onImageChange } = renderStep();
    const file = new File(['png'], 'logo-patas.png', { type: 'image/png' });

    await userEvent.upload(screen.getByLabelText('Logo ou foto da ONG'), file);

    expect(onImageChange).toHaveBeenCalledWith(file);
    const preview = screen.getByRole('img', {
      name: 'Prévia da imagem da ONG',
    });
    expect(preview).toHaveAttribute('src', 'blob:preview');
    expect(preview).toHaveClass('object-cover', 'size-20');
    expect(screen.getByText('logo-patas.png')).toBeInTheDocument();
    expect(screen.getByText('Trocar imagem')).toHaveAttribute(
      'for',
      'signup-image',
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Remover imagem' }),
    );

    expect(onImageChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('cancelar a escolha do arquivo não guarda nada', () => {
    const { onImageChange } = renderStep();

    fireEvent.change(screen.getByLabelText('Logo ou foto da ONG'), {
      target: { files: [] },
    });

    expect(onImageChange).not.toHaveBeenCalled();
    expect(screen.queryByText(SIGN_10)).not.toBeInTheDocument();
  });

  it('um erro de imagem some quando a ONG escolhe um arquivo válido', async () => {
    renderStep();
    const input = screen.getByLabelText('Logo ou foto da ONG');

    await userEvent.upload(
      input,
      new File(['x'], 'a.gif', { type: 'image/gif' }),
      {
        applyAccept: false,
      },
    );
    await userEvent.upload(
      input,
      new File(['x'], 'a.png', { type: 'image/png' }),
    );

    expect(screen.queryByText(SIGN_10)).not.toBeInTheDocument();
  });
});
