import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Switch } from './switch';

const meta = {
  title: 'UI/Switch',
  component: Switch,
  args: {
    'aria-label': 'Disponível para adoção: Mel',
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  play: async ({ args, canvas }) => {
    const toggle = canvas.getByRole('switch');
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(args.onCheckedChange).toHaveBeenCalledOnce();
  },
};

export const On: Story = {
  args: { defaultChecked: true },
  play: async ({ canvasElement }) => {
    const track = canvasElement.querySelector('[data-slot="switch"] > span')!;
    // Design System Toggle/On: 48×28 track in Disponível.
    await expect(getComputedStyle(track).width).toBe('48px');
    await expect(getComputedStyle(track).height).toBe('28px');
  },
};

export const OffTrack: Story = {
  play: async ({ canvasElement }) => {
    const track = canvasElement.querySelector('[data-slot="switch"] > span')!;
    // Design System Toggle/Off: grey #7D8580 track, not the light beige.
    await expect(getComputedStyle(track).backgroundColor).toBe(
      'rgb(125, 133, 128)',
    );
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const DisabledOn: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const Keyboard: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.keyboard(' ');
    await expect(canvas.getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  },
};
