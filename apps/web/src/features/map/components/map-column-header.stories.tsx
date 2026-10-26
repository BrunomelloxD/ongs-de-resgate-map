import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { MapColumnHeader } from './map-column-header';

const meta = {
  title: 'Map/MapColumnHeader',
  component: MapColumnHeader,
  decorators: [
    (Story) => (
      <div className="w-[392px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapColumnHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Sou uma ONG' }),
    ).toHaveAttribute('href', '/entrar');
  },
};
