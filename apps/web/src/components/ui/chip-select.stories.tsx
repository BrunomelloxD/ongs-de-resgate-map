import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent } from 'storybook/test';
import { ChipSelect, type ChipSelectProps } from './chip-select';

function Stateful(props: ChipSelectProps) {
  const [value, setValue] = useState(props.value);
  return <ChipSelect {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: 'UI/ChipSelect',
  component: ChipSelect,
  render: (args) => <Stateful {...args} />,
  args: {
    label: 'Distância',
    value: '5',
    options: [
      { value: '5', label: 'Até 5 km' },
      { value: '10', label: 'Até 10 km' },
      { value: '25', label: 'Até 25 km' },
    ],
    onValueChange: () => {},
  },
} satisfies Meta<typeof ChipSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Keyboard: Tab to the chip and pick with the arrows, like any select. */
export const Radius: Story = {
  play: async ({ canvas, canvasElement }) => {
    const select = canvas.getByRole('combobox', { name: 'Distância' });
    await userEvent.selectOptions(select, '10');
    await expect(
      canvasElement.querySelector('[data-slot="chip-select"]'),
    ).toHaveTextContent('Até 10 km');
  },
};

export const Placeholder: Story = {
  args: {
    label: 'Espécie',
    value: '',
    display: 'Espécie',
    options: [
      { value: '', label: 'Todas as espécies' },
      { value: 'DOG', label: 'Cão' },
      { value: 'CAT', label: 'Gato' },
    ],
  },
};

export const Active: Story = {
  args: { active: true, value: '10' },
};
