'use client';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type { DayHours } from '../ngo-account.types';

const t = ngoAccountDictionary.hours;

/** Monday first, Sunday last, like the design (07d). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONDAY = 1;
// SPEC_DEVIATION: the spec doesn't say what a reopened day without hours shows.
// Reason: the same 09:00–18:00 the wizard starts with, so the NGO only adjusts.
const DEFAULT_OPENS = '09:00';
const DEFAULT_CLOSES = '18:00';

export interface HoursFieldsProps {
  /** The 7 days, in any order. */
  values: DayHours[];
  onChange: (openingHours: DayHours[]) => void;
  /** Error of a day, by `dayOfWeek` (SIGN-25). */
  errors?: Partial<Record<number, string>>;
  /** Ids are `{idPrefix}-{dayOfWeek}-opens` and `-closes`, for an error summary. */
  idPrefix: string;
}

/** Opening hours of the week (SIGN-23 to SIGN-25), shared by the signup and the profile. */
export function HoursFields({
  values,
  onChange,
  errors = {},
  idPrefix,
}: HoursFieldsProps) {
  const byDay = new Map(values.map((day) => [day.dayOfWeek, day]));

  function update(dayOfWeek: number, patch: Partial<DayHours>) {
    onChange(
      values.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
      ),
    );
  }

  function toggle(day: DayHours, open: boolean) {
    update(
      day.dayOfWeek,
      open
        ? {
            closed: false,
            opensAt: day.opensAt ?? DEFAULT_OPENS,
            closesAt: day.closesAt ?? DEFAULT_CLOSES,
          }
        : { closed: true },
    );
  }

  /** SIGN-24: Monday's state and interval on the other 6 days. */
  function copyMonday() {
    const { closed, opensAt, closesAt } = byDay.get(MONDAY)!;
    onChange(values.map((day) => ({ ...day, closed, opensAt, closesAt })));
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        onClick={copyMonday}
        className="self-start rounded-full px-4 font-semibold whitespace-normal"
      >
        {t.copyMonday}
      </Button>

      {WEEK_ORDER.map((dayOfWeek) => {
        const day = byDay.get(dayOfWeek)!;
        const name = t.days[dayOfWeek]!;
        const error = errors[dayOfWeek];
        const id = `${idPrefix}-${dayOfWeek}`;
        const errorId = `${id}-error`;
        const timeInput = (field: 'opensAt' | 'closesAt') => (
          <div className="flex flex-col gap-1">
            <Label
              htmlFor={`${id}-${field === 'opensAt' ? 'opens' : 'closes'}`}
            >
              {t[field]}
            </Label>
            <Input
              id={`${id}-${field === 'opensAt' ? 'opens' : 'closes'}`}
              type="time"
              value={day[field] ?? ''}
              onChange={(e) => update(dayOfWeek, { [field]: e.target.value })}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="w-32"
            />
          </div>
        );

        return (
          <fieldset
            key={dayOfWeek}
            className="flow-root rounded-card bg-surface p-4"
          >
            <legend className="float-left pt-2.5 font-heading text-lg font-bold">
              {name}
            </legend>
            <div className="flex items-center justify-end gap-2">
              <Switch
                aria-label={t.switchLabel(name)}
                checked={!day.closed}
                onCheckedChange={(open) => toggle(day, open)}
              />
              <span aria-hidden="true" className="w-16 text-sm font-semibold">
                {day.closed ? t.closed : t.open}
              </span>
            </div>
            {!day.closed && (
              <div className="clear-both mt-3 flex flex-wrap items-end gap-3">
                {timeInput('opensAt')}
                <span
                  aria-hidden="true"
                  className="pb-3 text-sm text-fg-secondary"
                >
                  {t.until}
                </span>
                {timeInput('closesAt')}
              </div>
            )}
            {error && (
              <FieldError id={errorId} className="clear-both mt-3">
                {error}
              </FieldError>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
