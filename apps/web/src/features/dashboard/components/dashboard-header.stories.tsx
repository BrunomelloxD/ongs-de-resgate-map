import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';
import { DashboardHeader } from './dashboard-header';

const meta = {
  title: 'Dashboard/DashboardHeader',
  component: DashboardHeader,
  args: {
    ngoName: 'Patas do Bairro',
    logoutAction: fn(async () => undefined),
  },
} satisfies Meta<typeof DashboardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('link', { name: 'Perfil da ONG' }),
    ).toHaveAttribute('href', '/painel/perfil');
  },
};

export const LongName: Story = {
  args: { ngoName: 'Associação Protetora dos Animais de Maringá e Região' },
};

/** On a phone the name truncates and the actions wrap below it. */
export const Phone: Story = {
  args: { ngoName: 'Associação Protetora dos Animais de Maringá e Região' },
  globals: { viewport: { value: 'mobile' } },
};
