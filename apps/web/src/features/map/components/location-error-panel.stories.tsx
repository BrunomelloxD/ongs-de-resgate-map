import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationErrorPanel } from './location-error-panel';

const meta = {
  title: 'Map/LocationErrorPanel',
  component: LocationErrorPanel,
  args: {
    onRetry: fn(),
    search: (
      <div className="flex flex-col gap-2">
        <Label htmlFor="place">Cidade ou CEP</Label>
        <Input id="place" placeholder="Ex.: Campinas ou 13010-000" />
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LocationErrorPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Tentar de novo' }),
    );
    await expect(args.onRetry).toHaveBeenCalled();
  },
};
