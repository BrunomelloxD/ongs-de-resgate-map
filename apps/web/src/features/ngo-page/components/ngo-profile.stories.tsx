import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { ngoPageDictionary as t } from '../ngo-page.dictionary';
import { LOCAL_IMAGE_URL, makeNgo } from '../test-fixtures';
import { NgoProfile } from './ngo-profile';

const meta = {
  title: 'NgoPage/NgoProfile',
  component: NgoProfile,
  args: {
    ngo: makeNgo({ imageUrl: LOCAL_IMAGE_URL }),
    // Leaflet loads only in the app (next/dynamic); a placeholder keeps the layout.
    miniMap: <div className="size-full bg-surface-2" />,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NgoProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: /Como chegar/ }),
    ).toHaveAttribute('target', '_blank');
    await expect(
      canvas.getByRole('link', { name: t.profile.whatsapp }),
    ).toHaveAttribute('href', makeNgo().whatsappUrl);
  },
};

export const Closed: Story = {
  args: {
    ngo: makeNgo({ imageUrl: LOCAL_IMAGE_URL, openNow: false, todayIndex: 0 }),
  },
};

export const WithoutImage: Story = {
  args: { ngo: makeNgo({ imageUrl: null }), miniMap: undefined },
};

/** C-24, O-03: the WhatsApp green with its logo; "Fecha às" beside the badge. Share moved to NgoCover. */
export const WhatsAppAndClosing: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Falar com a ONG no WhatsApp' }),
    ).toHaveClass('bg-whatsapp');
    await expect(canvas.getByText(/^Fecha às/)).toBeVisible();
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
