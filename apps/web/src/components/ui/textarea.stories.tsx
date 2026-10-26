import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Textarea } from './textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  args: {
    'aria-label': 'Descrição',
    placeholder: 'Conte a história da ONG…',
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const style = getComputedStyle(canvas.getByRole('textbox'));
    await expect(parseFloat(style.minHeight)).toBe(120);
    await expect(style.resize).toBe('none');
    await expect(style.borderTopLeftRadius).toBe('12px');
  },
};
export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'Curta' },
};
