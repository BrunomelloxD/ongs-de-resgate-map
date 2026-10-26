import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { AccountDeletedNotice } from './account-deleted-notice';

const meta = {
  title: 'Home/AccountDeletedNotice',
  component: AccountDeletedNotice,
} satisfies Meta<typeof AccountDeletedNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Conta excluída.',
    );
  },
};
