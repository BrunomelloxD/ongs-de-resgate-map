import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { LiveRegion } from '@/components/ui/live-region.client';
import type { DeleteAnimal, SetAvailability } from '../animal-form.types';
import { DeleteAnimalDialog } from './delete-animal-dialog.client';

const meta = {
  title: 'AnimalForm/DeleteAnimalDialog',
  component: DeleteAnimalDialog,
  args: {
    animalId: '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f',
    name: 'Caramelo',
    onDelete: fn<DeleteAnimal>(async () => ({
      ok: false,
      error: 'Não foi possível excluir agora. Tente de novo.',
    })),
    onMarkUnavailable: fn<SetAvailability>(async () => ({ ok: true })),
  },
  decorators: [
    (Story) => (
      <LiveRegion>
        <Story />
      </LiveRegion>
    ),
  ],
} satisfies Meta<typeof DeleteAnimalDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function open() {
  await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
  return screen.findByRole('dialog', { name: 'Excluir Caramelo?' });
}

export const Closed: Story = {};

/** AFORM-15 */
export const Open: Story = {
  play: async () => {
    const dialog = await open();
    for (const name of ['Excluir', 'Marcar como indisponível', 'Cancelar']) {
      await expect(within(dialog).getByRole('button', { name })).toBeVisible();
    }
  },
};

/** AFORM-16: the bucket is down (503). */
export const DeleteFails: Story = {
  play: async ({ args }) => {
    const dialog = await open();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Excluir' }),
    );
    await expect(
      await within(dialog).findByText(
        'Não foi possível excluir agora. Tente de novo.',
      ),
    ).toBeVisible();
    await expect(args.onDelete).toHaveBeenCalledWith(args.animalId);
  },
};

export const MarkUnavailable: Story = {
  play: async ({ args }) => {
    const dialog = await open();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Marcar como indisponível' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(args.onMarkUnavailable).toHaveBeenCalledWith(
      args.animalId,
      false,
    );
  },
};

export const Cancel: Story = {
  play: async ({ args }) => {
    const dialog = await open();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(args.onDelete).not.toHaveBeenCalled();
    await expect(args.onMarkUnavailable).not.toHaveBeenCalled();
  },
};
