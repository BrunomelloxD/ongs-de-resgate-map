import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { BackLink } from './back-link.client';

const meta = {
  title: 'UI/BackLink',
  component: BackLink,
  args: { href: '/', label: 'Voltar' },
  decorators: [
    (Story) => (
      <div className="bg-brand-deep p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BackLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/',
    );
  },
};
