'use client';

import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '@/components/ui/action-bar';
import { Button } from '@/components/ui/button';
import {
  ErrorSummary,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { hoursSchema } from '../schemas/signup.schema';
import { signupDictionary } from '../signup.dictionary';
import type { HoursValues } from '../signup.types';

const t = signupDictionary;

/** Error of each day, by `dayOfWeek`. */
export type HoursErrors = Partial<Record<number, string>>;

export const HOURS_ID_PREFIX = 'signup-hours';

export interface HoursSlot {
  errors: HoursErrors;
  /** The fields use the ids `{idPrefix}-{dayOfWeek}-opens`; the summary links to them. */
  idPrefix: string;
}

export interface StepHoursProps {
  values: HoursValues;
  /**
   * The hours fields of `features/ngo-account`, given by the app (a feature
   * doesn't import another).
   */
  renderFields: (slot: HoursSlot) => React.ReactNode;
  /** Called when the step is valid. */
  onContinue: () => void;
  onBack: () => void;
}

/** Step 4 of the signup (SIGN-23 to SIGN-25). */
export function StepHours({
  values,
  renderFields,
  onContinue,
  onBack,
}: StepHoursProps) {
  const [errors, setErrors] = useState<HoursErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [submitted, setSubmitted] = useState(values);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (attempt > 0) focusFirstError(formRef.current!);
  }, [attempt]);

  // Any change since the submit clears the errors until the next submit.
  const shown = values === submitted ? errors : {};

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = hoursSchema.safeParse(values);
    const next: HoursErrors = {};
    for (const issue of parsed.error?.issues ?? []) {
      const day = values.openingHours[issue.path[1] as number]!;
      next[day.dayOfWeek] ??= issue.message;
    }
    setErrors(next);
    setSubmitted(values);
    if (parsed.success) onContinue();
    else setAttempt((n) => n + 1);
  }

  // Same order as the fields: Monday first, Sunday last.
  const summary: ErrorSummaryItem[] = [1, 2, 3, 4, 5, 6, 0].flatMap((day) => {
    const message = shown[day];
    return message
      ? [
          {
            fieldId: `${HOURS_ID_PREFIX}-${day}-opens`,
            message: t.hours.dayError(t.hours.days[day]!, message),
          },
        ]
      : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {t.hours.title}
        </h1>
        <p className="text-lg text-fg-secondary">{t.hours.lead}</p>
      </div>

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
      >
        <ErrorSummary title={t.errorSummaryTitle} errors={summary} />

        {renderFields({ errors: shown, idPrefix: HOURS_ID_PREFIX })}

        <ActionBar>
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            {t.hours.back}
          </Button>
          <Button type="submit" size="lg">
            {t.hours.submit}
          </Button>
        </ActionBar>
      </form>
    </div>
  );
}
