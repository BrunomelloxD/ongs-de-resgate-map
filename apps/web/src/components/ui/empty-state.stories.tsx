import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PawPrint, Plus, Search } from 'lucide-react';
import { expect } from 'storybook/test';
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
  args: { illustration: <PawPrint /> },
};

export const MapEmpty: Story = {
  args: {
    title: 'Nenhuma ONG cadastrada aqui ainda',
    description:
      'Tente aumentar a distância da busca ou procure em outra cidade.',
    illustration: <Search />,
    actions: [
      <Button key="a">Ampliar raio</Button>,
      <Button key="b" variant="outline">
        Buscar outra cidade
      </Button>,
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    const [first, second] = canvas.getAllByRole('button');
    // Stacked, full width, left-aligned (Design System empty state).
    await expect(first!.getBoundingClientRect().width).toBe(
      second!.getBoundingClientRect().width,
    );
    await expect(second!.getBoundingClientRect().top).toBeGreaterThan(
      first!.getBoundingClientRect().bottom,
    );
    const pin = canvasElement.querySelector('[data-slot="pin-photo"]')!;
    await expect(getComputedStyle(pin).height).toBe('73px');
  },
};

export const FirstAccess: Story = {
  args: {
    title: 'Boas-vindas, Patas do Bairro!',
    illustration: <Plus />,
    illustrationTone: 'brand',
  },
};

/** Figcraft 04-pagina-da-ong-sem-animais: centred in a card. */
export const Card: Story = {
  args: {
    layout: 'card',
    title: 'A Patas do Bairro ainda não cadastrou animais',
    description:
      'Fale com a ONG pelo WhatsApp para saber quem está esperando um lar.',
  },
};
