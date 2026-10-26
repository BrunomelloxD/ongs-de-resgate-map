import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveRegion } from '@/components/ui/live-region.client';
import type { ForgotPasswordState } from '../auth.types';
import { ForgotPasswordForm } from './forgot-password-form.client';

const SENT = 'Se houver uma conta com este e-mail, enviamos um link.';

function renderForm(
  answer: (
    data: FormData,
  ) => ForgotPasswordState | Promise<ForgotPasswordState>,
) {
  const action = vi.fn(async (_s: ForgotPasswordState, data: FormData) =>
    answer(data),
  );
  render(
    <LiveRegion>
      <ForgotPasswordForm action={action} />
    </LiveRegion>,
  );
  return action;
}

const sent = (data: FormData) => ({
  email: data.get('email') as string,
  sentMessage: SENT,
});

const resendButton = () => screen.getByRole('button', { name: /^Reenviar/ });

describe('ForgotPasswordForm', () => {
  afterEach(() => vi.useRealTimers());

  it('mostra o e-mail, "Enviar link" e o link de volta ao login', () => {
    renderForm(sent);

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    expect(
      screen.getByRole('button', { name: 'Enviar link' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar para o login' }),
    ).toHaveAttribute('href', '/entrar');
  });

  it('AUTH-08: depois do envio, mostra a mensagem e a anuncia', async () => {
    const action = renderForm(sent);

    await userEvent.type(screen.getByLabelText('E-mail'), 'contato@patas.org');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    const heading = await screen.findByRole('heading', {
      name: 'Confira seu e-mail',
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent(SENT);
    expect(screen.getAllByText(SENT)).toHaveLength(2);
    expect(action.mock.calls[0]![1].get('email')).toBe('contato@patas.org');
  });

  it('AUTH-10: "Reenviar" fica desabilitado em 0 s e 59 s, com a contagem, e habilita em 60 s', async () => {
    // Only the clock and the countdown interval: Testing Library's waits keep real timeouts.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const user = userEvent.setup();
    const action = renderForm(sent);

    await user.type(screen.getByLabelText('E-mail'), 'contato@patas.org');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    await screen.findByRole('heading', { name: 'Confira seu e-mail' });

    expect(resendButton()).toBeDisabled();
    expect(resendButton()).toHaveTextContent('Reenviar em 1:00');

    await act(() => vi.advanceTimersByTimeAsync(59_000));
    expect(resendButton()).toBeDisabled();
    expect(resendButton()).toHaveTextContent('Reenviar em 0:01');

    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(resendButton()).toBeEnabled();
    expect(resendButton()).toHaveTextContent(/^Reenviar$/);

    // Resending uses the same e-mail and restarts the countdown.
    await user.click(resendButton());
    expect(action).toHaveBeenCalledTimes(2);
    expect(action.mock.calls[1]![1].get('email')).toBe('contato@patas.org');
    expect(await screen.findByText('Reenviar em 1:00')).toBeDisabled();
  });

  it('AUTH-11: o erro da action aparece no resumo e o foco vai ao e-mail', async () => {
    renderForm((data) => ({
      email: data.get('email') as string,
      formError: 'Muitos pedidos. Tente de novo em 1 hora.',
    }));

    await userEvent.type(screen.getByLabelText('E-mail'), 'contato@patas.org');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    const summary = await screen.findByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary).getByRole('link', {
        name: 'Muitos pedidos. Tente de novo em 1 hora.',
      }),
    ).toHaveAttribute('href', '#forgot-email');
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toHaveFocus());
    expect(screen.getByLabelText('E-mail')).toHaveValue('contato@patas.org');
    expect(
      screen.queryByRole('heading', { name: 'Confira seu e-mail' }),
    ).not.toBeInTheDocument();
  });

  it('e-mail inválido fica ligado ao campo', async () => {
    renderForm(() => ({
      email: 'x',
      fieldError: 'Informe um e-mail válido, como nome@ong.org.',
    }));

    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    await screen.findByRole('region', { name: 'Corrija para continuar' });
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@ong.org.',
    );
  });

  it('enquanto envia, o botão fica desabilitado', async () => {
    renderForm(() => new Promise<ForgotPasswordState>(() => undefined));

    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(
      await screen.findByRole('button', { name: 'Enviando…' }),
    ).toBeDisabled();
  });
});
