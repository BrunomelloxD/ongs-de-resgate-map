import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResetPasswordState } from '../auth.types';
import { ResetPasswordForm } from './reset-password-form.client';

function renderForm(
  answer: ResetPasswordState | Promise<ResetPasswordState> = {
    fieldErrors: {},
  },
) {
  const action = vi.fn(
    async (_s: ResetPasswordState, _data: FormData) => answer,
  );
  render(<ResetPasswordForm action={action} />);
  return action;
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

const rule = (label: string) =>
  screen.getByText(label, { exact: false }).closest('li');

describe('ResetPasswordForm', () => {
  it('SIGN-15: as regras começam não atendidas e são marcadas ao digitar', async () => {
    renderForm();

    expect(rule('8 ou mais caracteres')).toHaveTextContent('(não atendida)');
    expect(rule('Ao menos uma letra')).toHaveTextContent('(não atendida)');
    expect(rule('Ao menos um número')).toHaveTextContent('(não atendida)');

    await userEvent.type(screen.getByLabelText('Nova senha'), 'abc1');

    expect(rule('8 ou mais caracteres')).toHaveTextContent('(não atendida)');
    expect(rule('Ao menos uma letra')).toHaveTextContent('(atendida)');
    expect(rule('Ao menos um número')).toHaveTextContent('(atendida)');

    await userEvent.type(screen.getByLabelText('Nova senha'), 'defg');

    expect(rule('8 ou mais caracteres')).toHaveTextContent('(atendida)');
  });

  it('envia a nova senha e a confirmação para a action', async () => {
    const action = renderForm();

    await userEvent.type(screen.getByLabelText('Nova senha'), 'novaSenha99');
    await userEvent.type(
      screen.getByLabelText('Confirme a nova senha'),
      'novaSenha99',
    );
    await submit();

    const data = action.mock.calls[0]![1];
    expect(data.get('password')).toBe('novaSenha99');
    expect(data.get('confirmation')).toBe('novaSenha99');
  });

  it('AUTH-13: link vencido mostra "Este link expirou ou já foi usado." e o link "Pedir outro link" para /recuperar-senha', async () => {
    renderForm({
      fieldErrors: {},
      linkGone: 'Este link expirou ou já foi usado.',
    });

    await submit();

    expect(
      await screen.findByRole('heading', {
        name: 'Este link expirou ou já foi usado.',
      }),
    ).toHaveFocus();
    expect(
      screen.getByRole('link', { name: 'Pedir outro link' }),
    ).toHaveAttribute('href', '/recuperar-senha');
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('SIGN-16: o erro da confirmação aparece no resumo e no campo, com o foco nele', async () => {
    renderForm({
      fieldErrors: { confirmation: 'As senhas não conferem.' },
    });

    await submit();

    const summary = await screen.findByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary).getByRole('link', { name: 'As senhas não conferem.' }),
    ).toHaveAttribute('href', '#reset-confirmation');
    expect(
      screen.getByLabelText('Confirme a nova senha'),
    ).toHaveAccessibleDescription('As senhas não conferem.');
    expect(screen.getByLabelText('Confirme a nova senha')).toHaveFocus();
  });

  it('o erro da senha fica ligado ao campo, junto com as regras', async () => {
    renderForm({
      fieldErrors: { password: 'A senha precisa de ao menos um número.' },
    });

    await submit();

    await screen.findByRole('region', { name: 'Corrija para continuar' });
    expect(screen.getByLabelText('Nova senha')).toHaveFocus();
    expect(screen.getByLabelText('Nova senha')).toHaveAccessibleDescription(
      expect.stringContaining('A senha precisa de ao menos um número.'),
    );
    expect(screen.getByLabelText('Nova senha')).toHaveAccessibleDescription(
      expect.stringContaining('A senha precisa ter:'),
    );
  });

  it('o erro geral da action aparece no resumo e marca a senha', async () => {
    renderForm({
      fieldErrors: {},
      formError: 'Não foi possível trocar a senha agora. Tente de novo.',
    });

    await submit();

    const summary = await screen.findByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary).getByRole('link', {
        name: 'Não foi possível trocar a senha agora. Tente de novo.',
      }),
    ).toHaveAttribute('href', '#reset-password');
    expect(screen.getByLabelText('Nova senha')).toHaveFocus();
  });

  it('enquanto envia, o botão fica desabilitado', async () => {
    renderForm(new Promise<ResetPasswordState>(() => undefined));

    await submit();

    expect(
      await screen.findByRole('button', { name: 'Salvando…' }),
    ).toBeDisabled();
  });
});
