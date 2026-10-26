import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { SiteHeader } from './site-header';

const meta = {
  title: 'UI/SiteHeader',
  component: SiteHeader,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Sou uma ONG' }),
    ).toHaveAttribute('href', '/entrar');
    const wide = window.matchMedia('(min-width: 64rem)').matches;
    const how = canvas.getByRole('link', {
      name: 'Como funciona',
      hidden: true,
    });
    // A flex item: shown as flex from 1024px, hidden below.
    await expect(getComputedStyle(how).display === 'none').toBe(!wide);
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};

export const DesktopOnly: Story = { args: { desktopOnly: true } };
