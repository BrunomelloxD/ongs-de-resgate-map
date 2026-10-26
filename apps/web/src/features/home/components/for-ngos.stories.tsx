import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { ForNgos } from './for-ngos';

const meta = {
  title: 'Home/ForNgos',
  component: ForNgos,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ForNgos>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Cadastrar minha ONG' }),
    ).toHaveAttribute('href', '/cadastro/sobre');
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
