'use client';

import { CircleCheck } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ErrorSummary,
  FieldError,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { PasswordInput } from '@/components/ui/password-input.client';
import { Label } from '@/components/ui/label';
import { PasswordRules } from '@/components/ui/password-rules';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type {
  ChangePasswordField,
  ChangePasswordState,
} from '../ngo-account.types';

const t = ngoAccountDictionary.password;

const FIELDS: readonly ChangePasswordField[] = [
  'currentPassword',
  'password',
  'confirmation',
];
const IDS: Record<ChangePasswordField, string> = {
  currentPassword: 'change-current-password',
  password: 'change-password',
  confirmation: 'change-confirmation',
};
const AUTOCOMPLETE: Record<ChangePasswordField, string> = {
  currentPassword: 'current-password',
  password: 'new-password',
  confirmation: 'new-password',
};
const RULES_ID = 'change-password-rules';

export interface ChangePasswordFormProps {
  /** The `changePassword` Server Action. */
  action: (
    state: ChangePasswordState,
    formData: FormData,
  ) => Promise<ChangePasswordState>;
}

/** The three fields; a new `key` mounts them empty. */
function PasswordFields({
  fieldErrors,
}: Pick<ChangePasswordState, 'fieldErrors'>) {
  const [password, setPassword] = useState('');

  return FIELDS.map((field) => {
    const error = fieldErrors[field];
    const describedBy =
      [error && `${IDS[field]}-error`, field === 'password' && RULES_ID]
        .filter(Boolean)
        .join(' ') || undefined;
    return (
      <div key={field} className="flex flex-col gap-2">
        <Label htmlFor={IDS[field]}>{t[field]}</Label>
        <PasswordInput
          id={IDS[field]}
          name={field}
          autoComplete={AUTOCOMPLETE[field]}
          required
          onChange={
            field === 'password'
              ? (event) => setPassword(event.target.value)
              : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {error && <FieldError id={`${IDS[field]}-error`}>{error}</FieldError>}
        {field === 'password' && (
          <PasswordRules
            id={RULES_ID}
            password={password}
            title={t.rulesTitle}
            metLabel={t.ruleMet}
            unmetLabel={t.ruleUnmet}
          />
        )}
      </div>
    );
  });
}

/** PROF-05, PROF-06, SIGN-15: the current password, the new one and its confirmation. */
export function ChangePasswordForm({ action }: ChangePasswordFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    fieldErrors: {},
  });
  const formRef = useRef<HTMLFormElement>(null);
  // React empties the form after each action: remount the fields so the live
  // rules (which keep the typed password) start empty too.
  const [round, setRound] = useState(0);
  const { fieldErrors, formError, success } = state;

  useEffect(() => setRound((n) => n + 1), [state]);
  // After the remount, so the focus lands on the new fields (A11Y-05).
  useEffect(() => {
    if (!state.success) focusFirstError(formRef.current!);
  }, [round, state.success]);

  const summary: ErrorSummaryItem[] = formError
    ? [{ fieldId: IDS.currentPassword, message: formError }]
    : FIELDS.flatMap((field) => {
        const message = fieldErrors[field];
        return message ? [{ fieldId: IDS[field], message }] : [];
      });

  return (
    <section
      id="alterar-senha"
      aria-labelledby="change-password-title"
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="change-password-title"
          className="font-heading text-2xl font-bold"
        >
          {t.title}
        </h2>
        <p className="text-sm text-fg-secondary">{t.lead}</p>
      </div>

      <div role="status">
        {success && (
          <p className="flex items-center gap-2 rounded-card bg-available-soft p-4 font-semibold text-available-fg">
            <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
            {success.message}
          </p>
        )}
      </div>

      <form
        ref={formRef}
        action={formAction}
        noValidate
        className="flex flex-col gap-4"
      >
        <ErrorSummary title={t.errorSummaryTitle} errors={summary} />
        <PasswordFields key={round} fieldErrors={fieldErrors} />
        <Button type="submit" size="lg" variant="outline" disabled={pending}>
          {pending ? t.pending : t.submit}
        </Button>
      </form>
    </section>
  );
}
