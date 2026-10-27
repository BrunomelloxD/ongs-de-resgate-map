import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import credits from '../credits.json';
import { makeDemoInfo, makeLockedDemoInfo } from '../test-fixtures';
import { AboutDemo } from './about-demo';

const meta = {
  title: 'Demo/AboutDemo',
  component: AboutDemo,
  args: { info: makeDemoInfo(), credits },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AboutDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DemoOn: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('definition')).toHaveLength(7);
  },
};

export const DemoOff: Story = {
  args: { info: makeDemoInfo({ enabled: false }) },
};

export const WithoutCredits: Story = { args: { credits: [] } };

/** DEP-63: the locked demo (AD-008). */
export const Locked: Story = { args: { info: makeLockedDemoInfo() } };
