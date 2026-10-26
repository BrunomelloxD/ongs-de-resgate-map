import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Chip, ChipGroup } from './chip';

const meta = {
  title: 'UI/Chip',
  component: Chip,
  args: { children: 'Cachorros', onPressedChange: fn() },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    const chip = canvas.getByRole('button', { name: 'Cachorros' });
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    const check = canvasElement.querySelector('[data-slot="chip-check"]')!;
    await expect(getComputedStyle(check).display).toBe('none');
    await userEvent.click(chip);
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(args.onPressedChange).toHaveBeenCalledOnce();
  },
};

export const On: Story = {
  args: { defaultPressed: true },
  play: async ({ canvasElement }) => {
    const check = canvasElement.querySelector('[data-slot="chip-check"]')!;
    await expect(getComputedStyle(check).display).toBe('block');
  },
};
export const Disabled: Story = { args: { disabled: true } };

export const Keyboard: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button')).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(canvas.getByRole('button')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const Group: Story = {
  render: () => (
    <ChipGroup label="Espécie">
      <Chip defaultPressed>Cães</Chip>
      <Chip>Gatos</Chip>
      <Chip>Outros</Chip>
    </ChipGroup>
  ),
};
