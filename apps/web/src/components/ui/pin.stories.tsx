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
  },
};
