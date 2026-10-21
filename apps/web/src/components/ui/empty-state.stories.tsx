import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PawPrint } from 'lucide-react';
import { Button } from './button';
import { EmptyState } from './empty-state';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  args: {
    title: 'Nenhuma ONG por aqui',
    description: 'Ainda não há ONGs nesta região. Tente aumentar o raio.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoActions: Story = {};

export const OneAction: Story = {
  args: { actions: [<Button key="a">Aumentar o raio</Button>] },
};

export const TwoActions: Story = {
  args: {
    actions: [
      <Button key="a">Aumentar o raio</Button>,
      <Button key="b" variant="outline">
        Limpar filtros
      </Button>,
    ],
  },
};

export const WithIllustration: Story = {
  args: { illustration: <PawPrint className="size-12" /> },
};
