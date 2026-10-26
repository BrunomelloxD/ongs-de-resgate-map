import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { HowItWorks } from './how-it-works';

const meta = {
  title: 'Home/HowItWorks',
  component: HowItWorks,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HowItWorks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-slot="pin-photo"]'),
    ).not.toBeNull();
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
