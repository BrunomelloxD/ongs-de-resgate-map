import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { WhatsAppIcon } from './whatsapp-icon';

const meta = {
  title: 'UI/WhatsAppIcon',
  component: WhatsAppIcon,
} satisfies Meta<typeof WhatsAppIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { className: 'size-8 text-fg' },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('[data-slot="whatsapp-icon"]')!;
    await expect(svg.getAttribute('aria-hidden')).toBe('true');
  },
};
