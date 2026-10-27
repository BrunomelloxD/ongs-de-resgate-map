import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { PinPicker } from './pin-picker.client';

// Plain tile drawn locally: stories never fetch real tiles.
const STORY_TILE_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#ece8df"/><path d="M0 128H256M128 0V256" stroke="#f5d48a" stroke-width="10"/></svg>',
)}`;

const meta = {
  title: 'UI/PinPicker',
  component: PinPicker,
  args: {
    tileUrl: STORY_TILE_URL,
    attribution: '© OpenStreetMap contributors',
    position: [-23.588, -46.634],
    onConfirmedChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PinPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AddressFound: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', {
        name: 'Pino da ONG, arraste até o local',
      }),
    ).toBeVisible();
  },
};

export const AddressNotFound: Story = {
  args: { notFound: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Arraste o pino até o local')).toBeVisible();
  },
};

/** DEP-60: the saved location in the profile; the map and the pin don't move. */
export const ReadOnly: Story = { args: { readOnly: true } };

export const Confirmed: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Confirmar localização' }),
    );
    await expect(args.onConfirmedChange).toHaveBeenCalledWith([
      -23.588, -46.634,
    ]);
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Localização confirmada.',
    );
  },
};
