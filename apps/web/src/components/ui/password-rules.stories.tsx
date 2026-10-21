import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PasswordRules } from './password-rules';

const meta = {
  title: 'UI/PasswordRules',
  component: PasswordRules,
  args: { password: '' },
} satisfies Meta<typeof PasswordRules>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Partial: Story = { args: { password: 'abc1' } };

export const AllMet: Story = { args: { password: 'senha1234' } };
