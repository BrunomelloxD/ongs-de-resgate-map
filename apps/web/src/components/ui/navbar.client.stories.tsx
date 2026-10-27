import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Navbar, type SessionStatus } from './navbar.client';

const visitor = async (): Promise<SessionStatus> => ({ loggedIn: false });
const logged = async (): Promise<SessionStatus> => ({
  loggedIn: true,
  name: 'Patas do Bairro',
  avatarUrl: '/photos/home-shelter-thumb.webp',
});

const meta = {
  title: 'UI/Navbar',
  component: Navbar,
  parameters: { layout: 'fullscreen' },
  args: { logoutAction: fn(async () => {}), fetchStatus: visitor },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: 'desktop' } };
const mobile = { viewport: { value: 'mobile' } };

export const Desktop: Story = {
  globals: desktop,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar',
    );
    const wide = window.matchMedia('(min-width: 64rem)').matches;
    const nav = canvas.getByRole('navigation', {
      name: 'Principal',
      hidden: true,
    });
    // Shown from 1024px, hidden below.
    await expect(getComputedStyle(nav).display === 'none').toBe(!wide);
  },
};

export const DesktopLinkAtivo: Story = {
  globals: desktop,
  args: { current: 'map' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Mapa de ONGs', hidden: true }),
    ).toHaveAttribute('aria-current', 'page');
  },
};

export const DesktopLogada: Story = {
  globals: desktop,
  args: { fetchStatus: logged },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('link', { name: 'Área da ONG Patas do Bairro' }),
    ).toHaveAttribute('href', '/painel');
  },
};

export const DesktopRolada: Story = {
  globals: desktop,
  args: { solid: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('banner')).toHaveAttribute(
      'data-raised',
      'true',
    );
  },
};

export const Mobile: Story = { globals: mobile };

export const MobileLogada: Story = {
  globals: mobile,
  args: { fetchStatus: logged },
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Área da ONG Patas do Bairro' });
  },
};

export const MobileMenuAberto: Story = {
  globals: mobile,
  args: { current: 'map' },
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole('button', { name: 'Abrir menu' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Menu' });
    await expect(
      within(dialog).getByRole('link', { name: 'Mapa de ONGs' }),
    ).toHaveAttribute('aria-current', 'page');
    // Focus stays trapped in the open menu (Base UI hands it back on the next tick).
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    for (let i = 0; i < 10; i++) {
      await userEvent.tab();
      await waitFor(() =>
        expect(dialog.contains(document.activeElement)).toBe(true),
      );
    }
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const MobileMenuLogada: Story = {
  globals: mobile,
  args: { fetchStatus: logged },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('link', { name: 'Área da ONG Patas do Bairro' });
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir menu' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole(
      'dialog',
      { name: 'Menu' },
    );
    await expect(
      within(dialog).getByRole('link', { name: 'Ir para a Área da ONG' }),
    ).toHaveAttribute('href', '/painel');
    // Visible once the 200 ms fade-in ends.
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Sair' }),
      ).toBeVisible(),
    );
  },
};
