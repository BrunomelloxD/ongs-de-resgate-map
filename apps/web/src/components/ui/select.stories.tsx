import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Select } from './select';

const meta = {
  title: 'UI/Select',
  component: Select,
  args: {
    'aria-label': 'Unidade',
    defaultValue: 'YEARS',
    children: (
      <>
        <option value="YEARS">Anos</option>
        <option value="MONTHS">Meses</option>
      </>
    ),
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const style = getComputedStyle(canvas.getByRole('combobox'));
    await expect(parseFloat(style.height)).toBe(52);
    await expect(style.appearance).toBe('none');
  },
};
export const Invalid: Story = { args: { 'aria-invalid': true } };
export const Disabled: Story = { args: { disabled: true } };
