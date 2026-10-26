import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Mail, Plus } from 'lucide-react';
import { expect } from 'storybook/test';
import { PinPhoto } from './pin-photo';

const meta = {
  title: 'UI/PinPhoto',
  component: PinPhoto,
  args: {
    width: 200,
    image: (
      <img
        src="/photos/signup-cat.webp"
        alt="Gato malhado de olhos azuis"
        width={400}
        height={520}
      />
    ),
  },
} satisfies Meta<typeof PinPhoto>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Photo: Story = {
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector('[data-slot="pin-photo"]')!;
    await expect(getComputedStyle(frame).height).toBe('260px');
    await expect(getComputedStyle(frame).maskImage).toContain('svg');
  },
};

export const Envelope: Story = {
  args: {
    width: 64,
    image: undefined,
    icon: <Mail className="size-7" />,
    className: 'bg-brand-deep text-brand',
  },
};

export const FirstAnimal: Story = {
  args: {
    width: 72,
    image: undefined,
    icon: <Plus className="size-8" />,
    className: 'bg-brand-deep text-brand',
  },
};
