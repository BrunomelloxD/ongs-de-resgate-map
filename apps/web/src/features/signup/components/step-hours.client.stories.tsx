import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { DayValues } from '../signup.types';
import { StepHours, type HoursSlot } from './step-hours.client';

const WEEK: DayValues[] = Array.from({ length: 7 }, (_, dayOfWeek) =>
  dayOfWeek === 0
    ? { dayOfWeek, closed: true, opensAt: null, closesAt: null }
    : { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '18:00' },
);

/**
 * Stand-in for the HoursFields of `features/ngo-account`, which the app passes
 * in (a feature doesn't import another; see NgoAccount/HoursFields).
 */
function Fields({ slot }: { slot: HoursSlot }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${slot.idPrefix}-1-opens`}>Abertura de segunda</label>
      <input
        id={`${slot.idPrefix}-1-opens`}
        readOnly
        className="min-h-11 rounded-lg border px-2"
        aria-invalid={slot.errors[1] ? true : undefined}
        value="18:00"
      />
      {slot.errors[1] && <p className="text-error-fg">{slot.errors[1]}</p>}
    </div>
  );
}

const meta = {
  title: 'Signup/StepHours',
  component: StepHours,
  args: {
    values: { openingHours: WEEK },
    renderFields: (slot) => <Fields slot={slot} />,
    onContinue: fn(),
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StepHours>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Valid: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Revisar cadastro' }),
    );
    await waitFor(() => expect(args.onContinue).toHaveBeenCalled());
  },
};

export const InvalidInterval: Story = {
  args: {
    values: {
      openingHours: WEEK.map((d) =>
        d.dayOfWeek === 1 ? { ...d, opensAt: '18:00', closesAt: '09:00' } : d,
      ),
    },
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Revisar cadastro' }),
    );
    await expect(
      canvas.getByRole('link', {
        name: 'Segunda: O horário de fechamento deve ser depois da abertura.',
      }),
    ).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByLabelText('Abertura de segunda')).toHaveFocus(),
    );
    await expect(args.onContinue).not.toHaveBeenCalled();
  },
};
