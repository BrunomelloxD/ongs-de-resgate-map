import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent } from 'storybook/test';
import { Option } from './option';

const meta = {
  title: 'UI/Option',
  component: Option,
  args: { name: 'size', value: 'SMALL', children: 'Pequeno' },
  render: () => (
    <fieldset className="flex max-w-md flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">Porte</legend>
      <div className="grid grid-cols-3 gap-2">
        <Option name="size" value="SMALL" defaultChecked>
          Pequeno
        </Option>
        <Option name="size" value="MEDIUM">
          Médio
        </Option>
        <Option name="size" value="LARGE">
          Grande
        </Option>
      </div>
    </fieldset>
  ),
} satisfies Meta<typeof Option>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const label = canvas.getByText('Médio').closest('label')!;
    const style = getComputedStyle(label);
    await expect(parseFloat(style.height)).toBe(52);
    await expect(style.borderTopLeftRadius).toBe('12px');
    await userEvent.click(canvas.getByText('Médio'));
    await expect(canvas.getByRole('radio', { name: 'Médio' })).toBeChecked();
  },
};
