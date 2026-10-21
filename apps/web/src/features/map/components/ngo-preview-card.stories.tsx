import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { LOCAL_THUMB_URL, makeRankedNgo } from '../test-fixtures';
import { NgoPreviewCard } from './ngo-preview-card';

const meta = {
  title: 'Map/NgoPreviewCard',
  component: NgoPreviewCard,
  args: { ngo: makeRankedNgo({ thumbUrl: LOCAL_THUMB_URL }) },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NgoPreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Ver ONG e animais' }),
    ).toHaveAttribute('href', '/ong/patas-do-bairro');
  },
};

export const Closed: Story = {
  args: {
    ngo: makeRankedNgo({
      thumbUrl: LOCAL_THUMB_URL,
      openNow: false,
      todayHours: { closed: true, opensAt: null, closesAt: null },
      distanceKm: 0.85,
    }),
  },
};

export const WithoutImage: Story = {
  args: { ngo: makeRankedNgo({ thumbUrl: null }) },
};
