import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { AppBar } from './app-bar';

const meta = {
  title: 'UI/AppBar',
  component: AppBar,
  args: {
    title: 'Cadastrar animal',
    back: { href: '/painel', label: 'Voltar para seus animais' },
    icon: 'close',
  },
} satisfies Meta<typeof AppBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Close: Story = {
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Voltar para seus animais' });
    const box = link.getBoundingClientRect();
    await expect(box.width).toBeGreaterThanOrEqual(44);
    await expect(box.height).toBeGreaterThanOrEqual(44);
  },
};

export const Back: Story = {
  args: {
    title: 'Perfil da ONG',
    titleAs: 'p',
    icon: 'back',
    back: { href: '/painel', label: 'Voltar para o painel' },
  },
};
