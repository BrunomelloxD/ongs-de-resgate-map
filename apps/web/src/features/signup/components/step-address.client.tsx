'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ErrorSummary,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { addressSchema } from '../schemas/signup.schema';
import { signupDictionary } from '../signup.dictionary';
import type { AddressValues } from '../signup.types';

const t = signupDictionary;

type Field = keyof AddressValues;
export type AddressErrors = Partial<Record<Field, string>>;

const FIELDS: readonly Field[] = [
  'cep',
  'street',
  'number',
  'complement',
  'district',
  'city',
  'uf',
  'location',
];
export const ADDRESS_ID_PREFIX = 'signup-address';

export interface AddressSlot {
  errors: AddressErrors;
  /** The fields use the ids `{idPrefix}-{field}`; the summary links to them. */
  idPrefix: string;
}

export interface StepAddressProps {
  values: AddressValues;
  /**
   * The address fields of `features/ngo-account`, given by the app (a feature
   * doesn't import another).
   */
  renderFields: (slot: AddressSlot) => React.ReactNode;
  /** Called when the step is valid. */
  onContinue: () => void;
  onBack: () => void;
}

/** Step 3 of the signup (SIGN-17 to SIGN-22): no advance without the confirmed pin. */
export function StepAddress({
  values,
  renderFields,
  onContinue,
  onBack,
}: StepAddressProps) {
  const [errors, setErrors] = useState<AddressErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [submitted, setSubmitted] = useState(values);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (attempt > 0) focusFirstError(formRef.current!);
  }, [attempt]);

  // A field changed since the submit loses its error until the next submit.
  const shown = Object.fromEntries(
    Object.entries(errors).filter(
      ([field]) => values[field as Field] === submitted[field as Field],
    ),
  ) as AddressErrors;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = addressSchema.safeParse(values);
    const next: AddressErrors = {};
    for (const issue of parsed.error?.issues ?? []) {
      const field = issue.path[0] as Field;
      next[field] ??= issue.message;
    }
    setErrors(next);
    setSubmitted(values);
    if (parsed.success) onContinue();
    else setAttempt((n) => n + 1);
  }

  const summary: ErrorSummaryItem[] = FIELDS.flatMap((field) => {
    const message = shown[field];
    return message
      ? [{ fieldId: `${ADDRESS_ID_PREFIX}-${field}`, message }]
      : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {t.address.title}
        </h1>
        <p className="text-lg text-fg-secondary">{t.address.lead}</p>
      </div>

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
      >
        <ErrorSummary title={t.errorSummaryTitle} errors={summary} />

        {renderFields({ errors: shown, idPrefix: ADDRESS_ID_PREFIX })}

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            className="rounded-full text-base font-semibold"
          >
            {t.address.back}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="rounded-full text-base font-semibold"
          >
            {t.address.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
