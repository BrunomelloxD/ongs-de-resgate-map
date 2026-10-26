import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, screen, userEvent, within } from 'storybook/test';
import {
  DeleteAccountDialog,
  type DeleteAccountDialogProps,
} from './delete-account-dialog.client';

const meta = {
  title: 'NgoAccount/DeleteAccountDialog',
  component: DeleteAccountDialog,
  args: {
    onDelete: fn<DeleteAccountDialogProps['onDelete']>(async () => ({
      error: 'Senha atual incorreta.',
    })),
  },
} satisfies Meta<typeof DeleteAccountDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function open() {
  await userEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));
  return screen.findByRole('dialog', { name: 'Excluir a conta da ONG?' });
}

export const Closed: Story = {};

/** PROF-07: without the password, the confirmation stays disabled. */
export const Open: Story = {
  play: async () => {
    const dialog = await open();
    await expect(
      within(dialog).getByText('todos os animais e as fotos'),
    ).toBeVisible();
    await expect(
      within(dialog).getByRole('button', { name: 'Excluir conta para sempre' }),
    ).toBeDisabled();
  },
};

/** PROF-08: a wrong password (403) shows on the field. */
export const WrongPassword: Story = {
  play: async ({ args }) => {
    const dialog = await open();
    await userEvent.type(
      within(dialog).getByLabelText('Senha atual'),
      'errada123',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Excluir conta para sempre' }),
    );
    await expect(
      await within(dialog).findByText('Senha atual incorreta.'),
    ).toBeVisible();
    await expect(args.onDelete).toHaveBeenCalledWith('errada123');
  },
};

/** PROF-08: the bucket is down (503) and nothing was deleted. */
export const Unavailable: Story = {
  args: {
    onDelete: fn<DeleteAccountDialogProps['onDelete']>(async () => ({
      error: 'Não foi possível excluir agora. Tente de novo.',
    })),
  },
  play: async () => {
    const dialog = await open();
    await userEvent.type(
      within(dialog).getByLabelText('Senha atual'),
      'senha1234',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Excluir conta para sempre' }),
    );
    await expect(
      await within(dialog).findByText(
        'Não foi possível excluir agora. Tente de novo.',
      ),
    ).toBeVisible();
  },
};
