import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { MapView } from './map-view.client';

// Plain tile drawn locally: stories never fetch real tiles.
const STORY_TILE_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#ece8df"/><path d="M0 128H256M128 0V256" stroke="#f5d48a" stroke-width="10"/></svg>',
)}`;

const meta = {
  title: 'UI/MapView',
  component: MapView,
  args: {
    tileUrl: STORY_TILE_URL,
    attribution: '© OpenStreetMap contributors',
    label: 'Mapa de ONGs',
    clusterLabel: (n: number) => `${n} ONGs nesta área`,
    // About 5 km around Vila Mariana, São Paulo.
    bounds: [
      [-23.63, -46.68],
      [-23.54, -46.58],
    ],
    onSelect: fn(),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-[560px] w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeNearbyPinsCluster: Story = {
  args: {
    markers: [
      {
        id: 'a',
        position: [-23.588, -46.634],
        variant: 'open',
        label: 'Patas do Bairro, aberta agora',
      },
      {
        id: 'b',
        position: [-23.5882, -46.6343],
        variant: 'closed',
        label: 'Gatil Sete Vidas, fechada agora',
      },
      {
        id: 'c',
        position: [-23.5878, -46.6338],
        variant: 'open',
        label: 'Lar do Caramelo, aberta agora',
      },
    ],
  },
  play: async ({ canvas }) => {
    const cluster = await canvas.findByRole('img', {
      name: '3 ONGs nesta área',
    });
    await expect(cluster).toHaveTextContent('3');
    await expect(
      canvas.queryByRole('img', { name: 'Patas do Bairro, aberta agora' }),
    ).toBeNull();
    await expect(
      canvas.getByText('© OpenStreetMap contributors'),
    ).toBeVisible();
    const leafletLink = canvas.getByRole('link', { name: 'Leaflet' });
    await expect(getComputedStyle(leafletLink).textDecorationLine).toBe(
      'underline',
    );
  },
};

export const SpreadPinsWithVisitor: Story = {
  args: {
    visitor: [-23.588, -46.634],
    markers: [
      {
        id: 'a',
        position: [-23.57, -46.65],
        variant: 'open',
        label: 'Patas do Bairro, aberta agora',
      },
      {
        id: 'b',
        position: [-23.61, -46.61],
        variant: 'closed',
        label: 'Gatil Sete Vidas, fechada agora',
      },
      {
        id: 'c',
        position: [-23.56, -46.6],
        variant: 'selected',
        label: 'Lar do Caramelo, selecionada',
      },
    ],
  },
  play: async ({ args, canvas }) => {
    const pin = await canvas.findByRole('button', {
      name: 'Gatil Sete Vidas, fechada agora',
    });
    pin.focus();
    await expect(pin).toHaveFocus();
    pin.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await waitFor(() => expect(args.onSelect).toHaveBeenCalledWith('b'));
    await expect(
      canvas.getByRole('img', { name: 'Sua localização' }),
    ).toBeVisible();
  },
};
