import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChangePasswordState } from '../ngo-account.types';
import {
  ChangePasswordForm,
  type ChangePasswordFormProps,
} from './change-password-form.client';

const CHANGED = 'Senha alterada. As outras sessões foram encerradas.';

function renderForm(answer: () => Promise<ChangePasswordState>) {
  const action = vi.fn<ChangePasswordFormProps['action']>(answer);
  render(<ChangePasswordForm action={action} />);
  return action;
}

const field = (label: string) => screen.getByLabelText(label);

async function fill(current = 'antiga123', password = 'novaSenha99') {
  await userEvent.type(field('Senha atual'), current);
  await userEvent.type(field('Nova senha'), password);
  await userEvent.type(field('Confirme a nova senha'), password);
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));

describe('ChangePasswordForm', () => {
  it('envia a senha atual, a nova e a confirmação', async () => {
    const action = renderForm(async () => ({ fieldErrors: {} }));

    await fill();
    await submit();

    const data = action.mock.calls[0]![1];
    expect(data.get('currentPassword')).toBe('antiga123');
    expect(data.get('password')).toBe('novaSenha99');
    expect(data.get('confirmation')).toBe('novaSenha99');
  });

  it('SIGN-15: as regras da nova senha mudam enquanto a ONG digita', async () => {
    renderForm(async () => ({ fieldErrors: {} }));

    const rules = screen.getByText('A senha precisa ter:').parentElement!;
    expect(
      within(rules).getByText('8 ou mais caracteres').closest('li'),
    ).toHaveAttribute('data-met', 'false');
    await userEvent.type(field('Nova senha'), 'novaSenha99');

    for (const rule of [
      '8 ou mais caracteres',
      'Ao menos uma letra',
      'Ao menos um número',
    ]) {
      expect(within(rules).getByText(rule).closest('li')).toHaveAttribute(
        'data-met',
        'true',
      );
    }
  });

  it('PROF-05: o sucesso anuncia a troca e limpa os campos', async () => {
    renderForm(async () => ({
      fieldErrors: {},
      success: { message: CHANGED, at: 1 },
    }));

    await fill();
    await submit();

    const message = await screen.findByText(CHANGED);
    expect(message.closest('[role="status"]')).not.toBeNull();
    // The fields remount in an effect right after the answer.
    await waitFor(() => {
      expect(field('Senha atual')).toHaveValue('');
      expect(field('Nova senha')).toHaveValue('');
      expect(field('Confirme a nova senha')).toHaveValue('');
      expect(
        within(screen.getByText('A senha precisa ter:').parentElement!)
          .getByText('Ao menos uma letra')
          .closest('li'),
      ).toHaveAttribute('data-met', 'false');
    });
  });

  it('PROF-06: o erro da action aparece no campo da senha atual, com o foco nele', async () => {
    renderForm(async () => ({
      fieldErrors: { currentPassword: 'Senha atual incorreta.' },
    }));

    await fill('errada123');
    await submit();

    await waitFor(() =>
      expect(field('Senha atual')).toHaveAccessibleDescription(
        'Senha atual incorreta.',
      ),
    );
    expect(field('Senha atual')).toHaveAttribute('aria-invalid', 'true');
    expect(
      within(
        screen.getByRole('region', { name: 'Corrija para continuar' }),
      ).getByRole('link', { name: 'Senha atual incorreta.' }),
    ).toHaveAttribute('href', '#change-current-password');
    await waitFor(() => expect(field('Senha atual')).toHaveFocus());
    expect(screen.queryByText(CHANGED)).not.toBeInTheDocument();
  });

  it('SIGN-16: o erro da confirmação fica ligado ao campo', async () => {
    renderForm(async () => ({
      fieldErrors: { confirmation: 'As senhas não conferem.' },
    }));

    await fill();
    await submit();

    await waitFor(() =>
      expect(field('Confirme a nova senha')).toHaveAccessibleDescription(
        'As senhas não conferem.',
      ),
    );
    expect(field('Nova senha')).not.toHaveAttribute('aria-invalid');
  });

  it('um erro geral vai para o resumo', async () => {
    renderForm(async () => ({
      fieldErrors: {},
      formError: 'ONG não encontrada.',
    }));

    await fill();
    await submit();

    expect(
      await screen.findByRole('link', { name: 'ONG não encontrada.' }),
    ).toHaveAttribute('href', '#change-current-password');
  });

  it('enquanto envia, o botão fica desabilitado com "Alterando…"', async () => {
    let finish!: (state: ChangePasswordState) => void;
    renderForm(() => new Promise((resolve) => (finish = resolve)));

    await fill();
    await submit();

    expect(screen.getByRole('button', { name: 'Alterando…' })).toBeDisabled();
    finish({ fieldErrors: {} });
    expect(
      await screen.findByRole('button', { name: 'Alterar senha' }),
    ).toBeEnabled();
  });
});
