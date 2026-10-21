import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test';
import { Button } from './button';
import { Dialog, DialogClose } from './dialog.client';

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  args: {
    title: 'Excluir Mel?',
    description: 'Essa ação não pode ser desfeita.',
    trigger: <Button>Excluir animal</Button>,
    children: null,
  },
  render: ({ children: _children, ...args }) => (
    <Dialog {...args}>
      <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
      <DialogClose render={<Button onClick={fn()} />}>Excluir</DialogClose>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const OpenAndConfirm: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Excluir animal' }),
    );
    await expect(
      await screen.findByRole('dialog', { name: 'Excluir Mel?' }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole('button', { name: 'Excluir animal' }),
    ).toHaveFocus();
  },
};

export const OpenAndEscape: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Excluir animal' }),
    );
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};

// Real browser: jsdom doesn't move focus like Chromium does.
export const FocusIsTrapped: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Excluir animal' }),
    );
    const dialog = await screen.findByRole('dialog');
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      // Base UI's focus guards hand focus back to the popup; never to the page behind.
      const active = document.activeElement as HTMLElement;
      await expect(
        dialog.contains(active) ||
          active.hasAttribute('data-base-ui-focus-guard'),
      ).toBe(true);
    }
  },
};
