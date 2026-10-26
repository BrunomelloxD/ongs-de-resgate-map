import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { DashboardMenu } from './dashboard-menu.client';

const meta = {
  title: 'Dashboard/DashboardMenu',
  component: DashboardMenu,
  globals: { viewport: { value: 'mobile' } },
  args: {
    ngoName: 'Patas do Bairro',
    email: 'contato@patasdobairro.org',
    imageUrl: '/photos/signup-cat.webp',
    slug: 'patas-do-bairro',
    currentPath: '/painel',
    logoutAction: fn(async () => {}),
  },
} satisfies Meta<typeof DashboardMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menu' }));
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Área da ONG' });
    await expect(
      within(dialog).getByRole('link', { name: 'Animais' }),
    ).toHaveAttribute('aria-current', 'page');
    // Focus stays trapped in the open menu.
    // (Base UI's focus guards hand focus back on the next tick.)
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    for (let i = 0; i < 8; i++) {
      await userEvent.tab();
      await waitFor(() =>
        expect(dialog.contains(document.activeElement)).toBe(true),
      );
    }
    await userEvent.keyboard('{Escape}');
    // Base UI unmounts the popup after its exit transition.
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};
