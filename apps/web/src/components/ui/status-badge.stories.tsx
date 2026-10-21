import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusBadge } from './status-badge';

const meta = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  args: { variant: 'open' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['open', 'closed', 'available', 'unavailable'],
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenNow: Story = { args: { variant: 'open' } };
export const Closed: Story = { args: { variant: 'closed' } };
export const Available: Story = { args: { variant: 'available' } };
export const Unavailable: Story = { args: { variant: 'unavailable' } };
