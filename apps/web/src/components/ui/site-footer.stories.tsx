import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { SiteFooter } from './site-footer';

const meta = {
  title: 'UI/SiteFooter',
  component: SiteFooter,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SiteFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Créditos das fotos' }),
    ).toHaveAttribute('href', '/sobre-a-demo');
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
