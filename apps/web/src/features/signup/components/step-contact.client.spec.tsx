import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { AvailabilityResult, ContactValues } from '../signup.types';
import { StepContact } from './step-contact.client';

const VALID: ContactValues = {
  email: 'contato@patas.org',
  whatsapp: '(11) 98765-4321',
  password: 'senha1234',
  confirmation: 'senha1234',
};
const TAKEN = 'Este e-mail já tem cadastro.';

interface Options {
  values?: Partial<ContactValues>;
  serverError?: string;
  check?: AvailabilityResult | Promise<AvailabilityResult>;
}

/** Keeps the values like the SignupProvider does. */
function renderStep({
  values = {},
  check = { status: 'available' },
  serverError,
}: Options = {}) {
  const checkEmail = vi.fn(async (_email: string) => check);
  const onContinue = vi.fn();
  const onBack = vi.fn();

  function Harness() {
    const [state, setState] = useState({ ...VALID, ...values });
    return (
      <StepContact
        values={state}
        onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
        checkEmail={checkEmail}
        serverError={serverError}
        onContinue={onContinue}
        onBack={onBack}
      />
    );
  }

  render(<Harness />);
  return { checkEmail, onContinue, onBack };
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Ir para Endereço' }));
const email = () => screen.getByLabelText('E-mail');
const rule = (label: string) =>
  screen.getByText(label, { exact: false }).closest('li');

describe('StepContact', () => {
  it('SIGN-31: o erro do envio final chega a uma etapa já montada e a próxima tentativa confere o e-mail de novo', async () => {
    const checkEmail = vi.fn(
      async (_email: string): Promise<AvailabilityResult> => ({
        status: 'available',
      }),
    );
    const props = {
      values: VALID,
      onChange: vi.fn(),
      checkEmail,
      onContinue: vi.fn(),
      onBack: vi.fn(),
    };
    const { rerender } = render(<StepContact {...props} />);
    await submit();
    expect(checkEmail).toHaveBeenCalledTimes(1);

    rerender(<StepContact {...props} serverError={TAKEN} />);

    expect(email()).toHaveAccessibleDescription(TAKEN);
    expect(
      screen.getByRole('link', { name: 'Entrar com este e-mail' }),
    ).toBeVisible();
    await submit();
    expect(checkEmail).toHaveBeenCalledTimes(2);
  });

  it('SIGN-31: e-mail que passou a existir no envio final aparece no campo com os 2 atalhos', () => {
    renderStep({ serverError: TAKEN });

    expect(email()).toHaveAttribute('aria-invalid', 'true');
    expect(email()).toHaveAccessibleDescription(TAKEN);
    expect(
      screen.getByRole('link', { name: 'Entrar com este e-mail' }),
    ).toHaveAttribute('href', '/entrar?email=contato%40patas.org');
    expect(
      screen.getByRole('link', { name: 'Recuperar senha' }),
    ).toHaveAttribute('href', '/recuperar-senha');
  });

  it('SIGN-12: e-mail em uso mostra o erro e os 2 atalhos com os href certos', async () => {
    renderStep({
      values: { email: 'contato+ong@patas.org' },
      check: { status: 'taken', error: TAKEN },
    });

    await userEvent.click(email());
    await userEvent.tab();

    expect(await screen.findByText(TAKEN)).toBeInTheDocument();
    expect(email()).toHaveAccessibleDescription(TAKEN);
    expect(
      screen.getByRole('link', { name: 'Entrar com este e-mail' }),
    ).toHaveAttribute('href', '/entrar?email=contato%2Bong%40patas.org');
    expect(
      screen.getByRole('link', { name: 'Recuperar senha' }),
    ).toHaveAttribute('href', '/recuperar-senha');
  });

  it('SIGN-12: e-mail em uso bloqueia o avanço, com uma só consulta por e-mail', async () => {
    const { checkEmail, onContinue } = renderStep({
      check: { status: 'taken', error: TAKEN },
    });

    await userEvent.click(email());
    await userEvent.tab();
    await submit();

    expect(onContinue).not.toHaveBeenCalled();
    expect(checkEmail).toHaveBeenCalledTimes(1);
    const summary = await screen.findByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(within(summary).getByRole('link', { name: TAKEN })).toHaveAttribute(
      'href',
      '#signup-email',
    );
    await waitFor(() => expect(email()).toHaveFocus());
  });

  it('trocar o e-mail esconde os atalhos e o erro', async () => {
    renderStep({ check: { status: 'taken', error: TAKEN } });

    await submit();
    await screen.findByRole('link', { name: 'Entrar com este e-mail' });
    await userEvent.type(email(), 'x');

    expect(
      screen.queryByRole('link', { name: 'Entrar com este e-mail' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(TAKEN)).not.toBeInTheDocument();
  });

  it('a resposta de um e-mail antigo não aparece depois que a ONG digita outro', async () => {
    let answer: (result: AvailabilityResult) => void = () => undefined;
    renderStep({
      check: new Promise<AvailabilityResult>((resolve) => (answer = resolve)),
    });

    await userEvent.click(email());
    await userEvent.tab();
    await userEvent.type(email(), 'x');
    answer({ status: 'taken', error: TAKEN });

    await waitFor(() =>
      expect(screen.queryByText(TAKEN)).not.toBeInTheDocument(),
    );
  });

  it('SIGN-11: e-mail inválido bloqueia o avanço sem chamar a api', async () => {
    const { checkEmail, onContinue } = renderStep({
      values: { email: 'contato@' },
    });

    await userEvent.click(email());
    await userEvent.tab();
    await submit();

    expect(checkEmail).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
    expect(email()).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@ong.org.',
    );
  });

  it('429 ou api fora: mostra o aviso no campo e deixa continuar', async () => {
    const notice =
      'Não conseguimos conferir o e-mail agora. Ele será conferido de novo ao criar a conta.';
    const { onContinue } = renderStep({
      check: { status: 'unchecked', error: notice },
    });

    await submit();

    expect(email()).toHaveAccessibleDescription(notice);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('e-mail livre ao sair do campo: sem erro nem atalhos', async () => {
    const { checkEmail } = renderStep();

    await userEvent.click(email());
    await userEvent.tab();

    await waitFor(() => expect(checkEmail).toHaveBeenCalledTimes(1));
    expect(email()).not.toHaveAccessibleDescription();
    expect(
      screen.queryByRole('link', { name: 'Entrar com este e-mail' }),
    ).not.toBeInTheDocument();
  });

  it('dados válidos e e-mail livre: confere o e-mail e continua', async () => {
    const { checkEmail, onContinue } = renderStep({
      values: { email: ' contato@patas.org ' },
    });

    await submit();

    expect(checkEmail).toHaveBeenCalledWith('contato@patas.org');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('enquanto confere o e-mail no envio, o botão fica desabilitado', async () => {
    renderStep({ check: new Promise<AvailabilityResult>(() => undefined) });

    await submit();

    expect(
      await screen.findByRole('button', { name: 'Conferindo o e-mail…' }),
    ).toBeDisabled();
  });

  it('SIGN-13: aplica a máscara (99) 99999-9999 ao digitar', async () => {
    renderStep({ values: { whatsapp: '' } });

    await userEvent.type(screen.getByLabelText('WhatsApp'), '11987654321');

    expect(screen.getByLabelText('WhatsApp')).toHaveValue('(11) 98765-4321');
  });

  it('SIGN-14: WhatsApp sem DDD válido bloqueia o avanço com erro no campo', async () => {
    const { onContinue } = renderStep({
      values: { whatsapp: '(20) 98765-4321' },
    });

    await submit();

    expect(screen.getByLabelText('WhatsApp')).toHaveAccessibleDescription(
      expect.stringContaining(
        'Informe o WhatsApp com DDD, como (11) 98765-4321.',
      ),
    );
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('SIGN-15: cada regra da senha muda de estado ao digitar', async () => {
    renderStep({ values: { password: '' } });

    expect(rule('8 ou mais caracteres')).toHaveTextContent('(não atendida)');
    expect(rule('Ao menos uma letra')).toHaveTextContent('(não atendida)');
    expect(rule('Ao menos um número')).toHaveTextContent('(não atendida)');

    await userEvent.type(screen.getByLabelText('Senha'), 'a');
    expect(rule('Ao menos uma letra')).toHaveTextContent('(atendida)');
    expect(rule('Ao menos um número')).toHaveTextContent('(não atendida)');

    await userEvent.type(screen.getByLabelText('Senha'), '1');
    expect(rule('Ao menos um número')).toHaveTextContent('(atendida)');
    expect(rule('8 ou mais caracteres')).toHaveTextContent('(não atendida)');

    await userEvent.type(screen.getByLabelText('Senha'), 'bcdef');
    expect(rule('8 ou mais caracteres')).toHaveTextContent('(não atendida)');
    await userEvent.type(screen.getByLabelText('Senha'), 'g');
    expect(rule('8 ou mais caracteres')).toHaveTextContent('(atendida)');
  });

  it('SIGN-15: senha fora das regras bloqueia o avanço com erro no campo', async () => {
    const { onContinue } = renderStep({
      values: { password: 'senhasemnumero', confirmation: 'senhasemnumero' },
    });

    await submit();

    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      expect.stringContaining('A senha precisa de ao menos um número.'),
    );
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('SIGN-16: confirmação diferente bloqueia com "As senhas não conferem." e foca o campo', async () => {
    const { onContinue } = renderStep({ values: { confirmation: 'outra123' } });

    await submit();

    const confirmation = screen.getByLabelText('Confirmar senha');
    expect(confirmation).toHaveAccessibleDescription('As senhas não conferem.');
    expect(onContinue).not.toHaveBeenCalled();
    await waitFor(() => expect(confirmation).toHaveFocus());

    await userEvent.type(confirmation, '4');
    expect(confirmation).not.toHaveAccessibleDescription();
  });

  it('"Voltar" chama onBack', async () => {
    const { onBack } = renderStep();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
