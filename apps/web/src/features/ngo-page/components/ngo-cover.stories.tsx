import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { LiveRegion } from '@/components/ui/live-region.client';
import { makeNgo } from '../test-fixtures';
import { NgoCover } from './ngo-cover';

const meta = {
  title: 'NgoPage/NgoCover',
  component: NgoCover,
  parameters: { layout: 'fullscreen' },
  args: {
    ngo: makeNgo({ imageUrl: '/photos/home-shelter.webp' }),
    backHref: '/',
    share: {
      title: 'Patas do Bairro',
      text: 'Resgatamos cães e gatos.',
      url: 'https://animalhelper.example/ong/patas-do-bairro',
    },
  },
  decorators: [
    (Story) => (
      <LiveRegion>
        <Story />
      </LiveRegion>
    ),
  ],
} satisfies Meta<typeof NgoCover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Voltar' })).toBeVisible();
  },
};

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop' } },
};

export const NoImage: Story = {
  args: { ngo: makeNgo({ imageUrl: null }) },
};
