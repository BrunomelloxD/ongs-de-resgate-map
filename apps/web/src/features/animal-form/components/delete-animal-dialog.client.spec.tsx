import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveRegion } from '@/components/ui/live-region.client';
import type { DeleteAnimal, SetAvailability } from '../animal-form.types';
import { DeleteAnimalDialog } from './delete-animal-dialog.client';

const ID = '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';

function setup({
  onDelete = vi.fn<DeleteAnimal>(async () => ({ ok: false, error: 'x' })),
  onMarkUnavailable = vi.fn<SetAvailability>(async () => ({ ok: true })),
} = {}) {
  const user = userEvent.setup();
  render(
    <LiveRegion>
      <DeleteAnimalDialog
        animalId={ID}
        name="Caramelo"
        onDelete={onDelete}
        onMarkUnavailable={onMarkUnavailable}
      />
    </LiveRegion>,
  );
  return { user, onDelete, onMarkUnavailable };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Excluir' }));
  return screen.findByRole('dialog', { name: 'Excluir Caramelo?' });
}

describe('DeleteAnimalDialog', () => {
  it('AFORM-15: "Excluir" abre o diálogo com a sugestão e as 3 ações', async () => {
    const { user } = setup();

    const dialog = await openDialog(user);

    expect(dialog).toHaveAccessibleDescription(
      /você pode marcar como indisponível/,
    );
    for (const name of ['Marcar como indisponível', 'Excluir', 'Cancelar']) {
      expect(within(dialog).getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('AFORM-16: "Excluir" chama a exclusão do animal', async () => {
    let finish!: () => void;
    const onDelete = vi.fn<DeleteAnimal>(
      () =>
        new Promise(
          (resolve) => (finish = () => resolve({ ok: false, error: 'x' })),
        ),
    );
    const { user, onMarkUnavailable } = setup({ onDelete });
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(onDelete).toHaveBeenCalledWith(ID);
    expect(onMarkUnavailable).not.toHaveBeenCalled();
    // Pending (the redirect is on its way): no double submit.
    expect(
      within(dialog).getByRole('button', { name: 'Excluir' }),
    ).toBeDisabled();
    // A pending action would hold the transitions of the next tests.
    await act(async () => finish());
  });

  it('AFORM-16: falha na exclusão mostra a mensagem no diálogo, que continua aberto', async () => {
    const onDelete = vi.fn<DeleteAnimal>(async () => ({
      ok: false,
      error: 'Não foi possível excluir agora. Tente de novo.',
    }));
    const { user } = setup({ onDelete });
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(
      await within(dialog).findByText(
        'Não foi possível excluir agora. Tente de novo.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Não foi possível excluir agora. Tente de novo.',
    );
  });

  it('AFORM-16: exclusão que cai (rejeita) mostra a mesma mensagem', async () => {
    const { user } = setup({
      onDelete: vi.fn<DeleteAnimal>(async () => Promise.reject(new Error())),
    });
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(
      await within(dialog).findByText(
        'Não foi possível excluir agora. Tente de novo.',
      ),
    ).toBeInTheDocument();
  });

  it('AFORM-15: "Marcar como indisponível" chama o toggle com false, fecha e anuncia', async () => {
    const { user, onDelete, onMarkUnavailable } = setup();
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole('button', { name: 'Marcar como indisponível' }),
    );

    expect(onMarkUnavailable).toHaveBeenCalledWith(ID, false);
    expect(onDelete).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Caramelo agora está indisponível.',
    );
  });

  it.each([
    ['{ ok: false }', vi.fn<SetAvailability>(async () => ({ ok: false }))],
    [
      'rejeição',
      vi.fn<SetAvailability>(async () => Promise.reject(new Error())),
    ],
  ])(
    'DASH-03: falha ao marcar (%s) mantém o diálogo com o erro',
    async (_case, onMarkUnavailable) => {
      const { user } = setup({ onMarkUnavailable });
      const dialog = await openDialog(user);

      await user.click(
        within(dialog).getByRole('button', {
          name: 'Marcar como indisponível',
        }),
      );

      expect(
        await within(dialog).findByText(
          'Não foi possível salvar. Tente de novo.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    },
  );

  it('"Cancelar" fecha sem chamar nada, e o erro anterior some', async () => {
    const onDelete = vi.fn<DeleteAnimal>(async () => ({
      ok: false,
      error: 'Não foi possível excluir agora. Tente de novo.',
    }));
    const { user, onMarkUnavailable } = setup({ onDelete });
    let dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    await within(dialog).findByText(
      'Não foi possível excluir agora. Tente de novo.',
    );
    onDelete.mockClear();

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onDelete).not.toHaveBeenCalled();
    expect(onMarkUnavailable).not.toHaveBeenCalled();
    dialog = await openDialog(user);
    expect(
      within(dialog).queryByText(
        'Não foi possível excluir agora. Tente de novo.',
      ),
    ).toBeNull();
  });
});
