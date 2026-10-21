import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { DayHours } from '../ngo-account.types';
import { HoursFields, type HoursFieldsProps } from './hours-fields.client';

const WEEK: DayHours[] = Array.from({ length: 7 }, (_, dayOfWeek) =>
  dayOfWeek === 0
    ? { dayOfWeek, closed: true, opensAt: null, closesAt: null }
    : dayOfWeek === 6
      ? { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '13:00' }
      : { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '18:00' },
);

function Stateful(props: HoursFieldsProps) {
  const [values, setValues] = useState(props.values);
  return (
    <HoursFields
      {...props}
      values={values}
      onChange={(next) => {
        props.onChange(next);
        setValues(next);
      }}
    />
  );
}

const meta = {
  title: 'NgoAccount/HoursFields',
  component: HoursFields,
  args: { values: WEEK, onChange: fn(), idPrefix: 'hours' },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md bg-surface-2 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HoursFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CopyMonday: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Copiar o horário de segunda para todos os dias',
      }),
    );
    const sunday = within(canvas.getByRole('group', { name: 'Domingo' }));
    await expect(
      sunday.getByRole('switch', { name: 'Domingo: aberta' }),
    ).toBeChecked();
    await expect(sunday.getByLabelText('Fechamento')).toHaveValue('18:00');
  },
};

export const CloseDay: Story = {
  play: async ({ canvas }) => {
    const tuesday = within(canvas.getByRole('group', { name: 'Terça' }));
    await userEvent.click(
      tuesday.getByRole('switch', { name: 'Terça: aberta' }),
    );
    await expect(tuesday.queryByLabelText('Abertura')).toBeNull();
  },
};

export const InvalidInterval: Story = {
  args: {
    values: WEEK.map((d) =>
      d.dayOfWeek === 1 ? { ...d, opensAt: '18:00', closesAt: '09:00' } : d,
    ),
    errors: { 1: 'O horário de fechamento deve ser depois da abertura.' },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('O horário de fechamento deve ser depois da abertura.'),
    ).toBeVisible();
  },
};
