import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Logo } from './logo';

const meta = {
  title: 'UI/Logo',
  component: Logo,
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Animal Helper')).toBeVisible();
  },
};

export const Light: Story = {
  args: { variant: 'light' },
  decorators: [
    (Story) => (
      <div className="bg-brand-deep p-6">
        <Story />
      </div>
    ),
  ],
};
