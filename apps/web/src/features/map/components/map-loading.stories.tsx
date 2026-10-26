import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { MapLoading } from './map-loading';

const meta = {
  title: 'Map/MapLoading',
  component: MapLoading,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-[600px] flex-col">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Procurando ONGs perto de você…',
    );
  },
};

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
};
