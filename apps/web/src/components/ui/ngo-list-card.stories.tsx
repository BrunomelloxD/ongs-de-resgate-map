import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { NgoListCard } from './ngo-list-card';

const meta = {
  title: 'UI/NgoListCard',
  component: NgoListCard,
  args: {
    thumb: (
      <img src="/photos/home-shelter.webp" alt="" width={72} height={72} />
    ),
    name: 'Patas do Bairro',
    openNow: true,
    distance: '1,2 km',
    hours: 'Hoje, 9h às 18h',
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NgoListCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Aberta agora')).toBeVisible();
  },
};

export const Closed: Story = {
  args: { openNow: false, hours: 'Abre amanhã às 8h' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Fechada')).toBeVisible();
  },
};
