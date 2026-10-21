import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';
import { Dialog, DialogClose } from './dialog.client';

function Example({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  return (
    <Dialog
      trigger={<Button>Excluir animal</Button>}
      title="Excluir Mel?"
      description="Essa ação não pode ser desfeita."
    >
      <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
      <DialogClose render={<Button onClick={onConfirm} />}>Excluir</DialogClose>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('começa fechado e abre pelo gatilho, com título e descrição', async () => {
    render(<Example />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir animal' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Excluir Mel?' });
    expect(dialog).toHaveAccessibleDescription(
      'Essa ação não pode ser desfeita.',
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  });

  it('Esc fecha e o foco volta ao botão que abriu', async () => {
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Excluir animal' });

    await userEvent.click(trigger);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it('é modal: o conteúdo de fora fica escondido da árvore de acessibilidade', async () => {
    render(
      <>
        <Example />
        <button>Fora</button>
      </>,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir animal' }),
    );
    await screen.findByRole('dialog');

    expect(
      screen.queryByRole('button', { name: 'Fora' }),
    ).not.toBeInTheDocument();
  });

  it('confirmar chama a ação e fecha o diálogo', async () => {
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir animal' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Excluir' }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('no modo controlado, avisa onOpenChange e segue a prop open', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Dialog
        open
        onOpenChange={onOpenChange}
        title="Sair sem salvar?"
        description="Há alterações."
      >
        <DialogClose>Ficar</DialogClose>
      </Dialog>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Ficar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());

    rerender(
      <Dialog
        open={false}
        onOpenChange={onOpenChange}
        title="Sair sem salvar?"
        description="Há alterações."
      >
        <DialogClose>Ficar</DialogClose>
      </Dialog>,
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
