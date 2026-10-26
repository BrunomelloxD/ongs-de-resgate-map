import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeleteAccountResult } from '../ngo-account.types';
import { DeleteAccountDialog } from './delete-account-dialog.client';

function renderDialog(
  onDelete: (password: string) => Promise<DeleteAccountResult> = async () => ({
    error: 'Senha atual incorreta.',
  }),
) {
  const spy = vi.fn(onDelete);
  render(<DeleteAccountDialog onDelete={spy} />);
  return spy;
}

const openDialog = () =>
  userEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));
const confirm = () =>
  screen.getByRole('button', { name: 'Excluir conta para sempre' });

describe('DeleteAccountDialog', () => {
  it('PROF-07: explica o que será apagado e pede a senha atual', async () => {
    renderDialog();

    await openDialog();

    const dialog = screen.getByRole('dialog', {
      name: 'Excluir a conta da ONG?',
    });
    expect(dialog).toHaveAccessibleDescription(
      'Isso apaga para sempre, sem como desfazer:',
    );
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([
      'os dados da ONG e a página pública',
      'os horários de funcionamento',
      'todos os animais e as fotos',
      'as sessões abertas em outros aparelhos',
    ]);
    expect(screen.getByLabelText('Senha atual')).toHaveAttribute(
      'type',
      'password',
    );
  });

  it('PROF-07: sem senha, o botão de confirmar fica desabilitado', async () => {
    renderDialog();
    await openDialog();

    expect(confirm()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Senha atual'), 'senha1234');
    expect(confirm()).toBeEnabled();
  });

  it('PROF-08: confirma com a senha digitada', async () => {
    let finish!: (result: DeleteAccountResult) => void;
    const onDelete = renderDialog(
      () => new Promise((resolve) => (finish = resolve)),
    );
    await openDialog();

    await userEvent.type(screen.getByLabelText('Senha atual'), 'senha1234');
    await userEvent.click(confirm());

    expect(onDelete).toHaveBeenCalledWith('senha1234');
    expect(screen.getByRole('button', { name: 'Excluindo…' })).toBeDisabled();
    finish({ error: 'Senha atual incorreta.' });
    expect(await screen.findByText('Senha atual incorreta.')).toBeVisible();
  });

  it('PROF-08: o 403 aparece no campo da senha', async () => {
    renderDialog();
    await openDialog();

    await userEvent.type(screen.getByLabelText('Senha atual'), 'errada123');
    await userEvent.click(confirm());

    const input = screen.getByLabelText('Senha atual');
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(input).toHaveAccessibleDescription(
      'Para confirmar, digite a senha da conta. Senha atual incorreta.',
    );

    await userEvent.type(input, '4');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('PROF-08: uma falha de rede mostra "Não foi possível excluir agora. Tente de novo."', async () => {
    renderDialog(async () => {
      throw new Error('offline');
    });
    await openDialog();

    await userEvent.type(screen.getByLabelText('Senha atual'), 'senha1234');
    await userEvent.click(confirm());

    expect(
      await screen.findByText('Não foi possível excluir agora. Tente de novo.'),
    ).toBeVisible();
  });

  it('cancelar fecha o diálogo e esquece a senha', async () => {
    renderDialog();
    await openDialog();
    await userEvent.type(screen.getByLabelText('Senha atual'), 'senha1234');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await openDialog();

    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
  });
});
