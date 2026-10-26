import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { HomeHero } from './home-hero';
import { AccountDeletedNotice } from './account-deleted-notice';

const meta = {
  title: 'Home/HomeHero',
  component: HomeHero,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HomeHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Encontrar ONGs perto de mim' }),
    ).toHaveAttribute('href', '/localizacao');
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};

/** PROF-08: right after the account is deleted. */
export const AccountDeleted: Story = {
  args: { notice: <AccountDeletedNotice /> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Conta excluída.',
    );
  },
};
