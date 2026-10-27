import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DemoAccountCard } from './demo-account-card';

const meta = {
  title: 'Demo/DemoAccountCard',
  component: DemoAccountCard,
  args: { email: 'demo@animalhelper.example', password: 'Demo1234' },
} satisfies Meta<typeof DemoAccountCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
