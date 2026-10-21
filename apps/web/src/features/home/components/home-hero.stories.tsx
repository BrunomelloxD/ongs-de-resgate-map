import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { HomeHero } from './home-hero';

const meta = {
  title: 'Home/HomeHero',
  component: HomeHero,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HomeHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Encontrar ONGs perto de mim' }),
    ).toHaveAttribute('href', '/localizacao');
    await expect(
      canvas.getByRole('link', { name: 'Sou uma ONG' }),
    ).toHaveAttribute('href', '/entrar');
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
