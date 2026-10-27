import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { SkipLink } from './skip-link';

const meta = {
  title: 'UI/SkipLink',
  component: SkipLink,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Escondido: Story = {};

export const ComFoco: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab();
    const link = canvas.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(link).toHaveFocus();
    await waitFor(() =>
      expect(link.getBoundingClientRect().top).toBeGreaterThanOrEqual(0),
    );
  },
};
