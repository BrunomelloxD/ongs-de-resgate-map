import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { DemoBanner } from './demo-banner';

const meta = {
  title: 'UI/DemoBanner',
  component: DemoBanner,
  args: { days: 7 },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DemoBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SevenDays: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', {
        name: 'Demonstração: os dados são apagados em 7 dias',
      }),
    ).toHaveAttribute('href', '/sobre-a-demo');
  },
};

export const ThirtyDays: Story = { args: { days: 30 } };

/** DEP-62: the locked demo (AD-008). */
export const Locked: Story = { args: { locked: true } };
