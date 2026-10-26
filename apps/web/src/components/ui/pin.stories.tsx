import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Pin } from './pin';

const meta = {
  title: 'UI/Pin',
  component: Pin,
  args: { variant: 'open' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['open', 'closed', 'selected', 'visitor'],
    },
  },
} satisfies Meta<typeof Pin>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { args: { variant: 'open' } };
export const Closed: Story = { args: { variant: 'closed' } };
export const Selected: Story = { args: { variant: 'selected' } };
export const SelectedWithPhoto: Story = {
  args: { variant: 'selected', photoUrl: '/photos/login-puppy.webp' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('image')).not.toBeNull();
  },
};
export const Visitor: Story = { args: { variant: 'visitor' } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <Pin variant="open" />
      <Pin variant="closed" />
      <Pin variant="selected" />
      <Pin variant="visitor" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('img')).toHaveLength(4);
    const visitorDot = canvas
      .getByRole('img', { name: 'Sua localização' })
      .querySelectorAll('circle')[2]!;
    // Design System "Você está aqui": #2F6FDE.
    await expect(getComputedStyle(visitorDot).fill).toBe('rgb(47, 111, 222)');
  },
};
