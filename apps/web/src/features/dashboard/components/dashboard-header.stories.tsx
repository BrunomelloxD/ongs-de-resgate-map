import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
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

export const Default: Story = {};

export const LongName: Story = {
  args: { ngoName: 'Associação Protetora dos Animais de Maringá e Região' },
};
