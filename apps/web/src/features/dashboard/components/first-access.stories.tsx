import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { makeMyNgo } from '../test-fixtures';
import { FirstAccess } from './first-access';

const meta = {
  title: 'Dashboard/FirstAccess',
  component: FirstAccess,
  args: { ngo: makeMyNgo(), animalCount: 0 },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FirstAccess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutImage: Story = {
  args: { ngo: makeMyNgo({ imageUrl: null }) },
};
