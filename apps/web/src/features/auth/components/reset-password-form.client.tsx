'use client';

import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ErrorSummary,
  FieldError,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordRules } from '@/components/ui/password-rules';
import { authDictionary } from '../auth.dictionary';
import type { ResetPasswordField, ResetPasswordState } from '../auth.types';

const t = authDictionary;

export const REQUEST_LINK_PATH = '/recuperar-senha';

const IDS: Record<ResetPasswordField, string> = {
  password: 'reset-password',
  confirmation: 'reset-confirmation',
};
const RULES_ID = 'reset-password-rules';

export interface ResetPasswordFormProps {
  /** `resetPassword` already bound to the link's token. */
  action: (
    state: ResetPasswordState,
    formData: FormData,
  ) => Promise<ResetPasswordState>;
}

/** AUTH-12, AUTH-13, SIGN-15, SIGN-16: the new password from the e-mail link. */
export function ResetPasswordForm({ action }: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    fieldErrors: {},
  });
  const [password, setPassword] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const goneRef = useRef<HTMLHeadingElement>(null);
  const { fieldErrors, formError, linkGone } = state;

  // The form is gone after a 410: keep focus on the new screen.
  useEffect(() => {
    if (state.linkGone) goneRef.current!.focus();
    else focusFirstError(formRef.current!);
  }, [state]);

  if (linkGone) {
    return (
      <div className="flex flex-col gap-6">
        <CircleAlert aria-hidden="true" className="size-12 text-error-fg" />
        <h1
          ref={goneRef}
          tabIndex={-1}
          className="text-3xl font-extrabold tracking-tight outline-none"
        >
          {linkGone}
        </h1>
        <Link
          href={REQUEST_LINK_PATH}
          className="touch-target inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 font-semibold text-on-brand"
        >
          {t.reset.requestAnother}
        </Link>
      </div>
    );
  }

  const summary: ErrorSummaryItem[] = formError
    ? [{ fieldId: IDS.password, message: formError }]
    : (['password', 'confirmation'] as const).flatMap((field) => {
        const message = fieldErrors[field];
        return message ? [{ fieldId: IDS[field], message }] : [];
      });

  const describedBy = (field: ResetPasswordField, extra?: string) =>
    [fieldErrors[field] && `${IDS[field]}-error`, extra]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {t.reset.title}
        </h1>
        <p className="text-lg text-fg-secondary">{t.reset.lead}</p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        noValidate
        className="flex flex-col gap-4"
      >
        <ErrorSummary title={t.errorSummaryTitle} errors={summary} />

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.password}>{t.reset.password}</Label>
          <Input
            id={IDS.password}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password || formError ? true : undefined}
            aria-describedby={describedBy('password', RULES_ID)}
          />
          {fieldErrors.password && (
            <FieldError id={`${IDS.password}-error`}>
              {fieldErrors.password}
            </FieldError>
          )}
          <PasswordRules
            id={RULES_ID}
            password={password}
            title={t.reset.rulesTitle}
            metLabel={t.reset.ruleMet}
            unmetLabel={t.reset.ruleUnmet}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.confirmation}>{t.reset.confirmation}</Label>
          <Input
            id={IDS.confirmation}
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={fieldErrors.confirmation ? true : undefined}
            aria-describedby={describedBy('confirmation')}
          />
          {fieldErrors.confirmation && (
            <FieldError id={`${IDS.confirmation}-error`}>
              {fieldErrors.confirmation}
            </FieldError>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="rounded-full text-base font-semibold"
        >
          {pending ? t.reset.pending : t.reset.submit}
        </Button>
      </form>
    </div>
  );
}
