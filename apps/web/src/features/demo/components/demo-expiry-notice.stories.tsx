import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DemoExpiryNotice } from './demo-expiry-notice';

const meta = {
  title: 'Demo/DemoExpiryNotice',
  component: DemoExpiryNotice,
  args: {
    expiresAt: '2026-10-27T13:00:00-03:00',
    now: '2026-10-21T12:00:00-03:00',
  },
} satisfies Meta<typeof DemoExpiryNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LastDay: Story = {
  args: { expiresAt: '2026-10-22T12:00:00-03:00' },
};

/** DEMO-20: with the demo off there is no date, and nothing renders. */
export const DemoOff: Story = { args: { expiresAt: null } };
