'use client';

import { ArrowLeft, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  ErrorSummary,
  FieldError,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input.client';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/logo';
import { authDictionary as t } from '../auth.dictionary';
import type { LoginState } from '../auth.types';

export const FORGOT_PASSWORD_PATH = '/recuperar-senha';
export const SIGNUP_PATH = '/cadastro/sobre';

const EMAIL_ID = 'login-email';
const PASSWORD_ID = 'login-password';

export interface LoginFormProps {
  /** The `login` Server Action. */
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
  /** From `?email=` (SIGN-12 shortcut). */
  defaultEmail?: string;
  /** From `?senha=alterada` (AUTH-12). */
  passwordChanged?: boolean;
}

/** AUTH-01 to AUTH-04: e-mail and password, with the error summary (A11Y-05). */
export function LoginForm({
  action,
  defaultEmail = '',
  passwordChanged = false,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    email: defaultEmail,
    fieldErrors: {},
  });
  const formRef = useRef<HTMLFormElement>(null);
  const { fieldErrors, formError } = state;
  const emailError = fieldErrors.email ?? formError;
  const passwordError = fieldErrors.password ?? formError;

  const summary: ErrorSummaryItem[] = formError
    ? [{ fieldId: EMAIL_ID, message: formError }]
    : [
        ...(fieldErrors.email
          ? [{ fieldId: EMAIL_ID, message: fieldErrors.email }]
          : []),
        ...(fieldErrors.password
          ? [{ fieldId: PASSWORD_ID, message: fieldErrors.password }]
          : []),
      ];

  // Every answer of the action is a new object: focus after each failed submit.
  useEffect(() => {
    focusFirstError(formRef.current!);
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      {/* On desktop the AuthShell panel carries the logo; there is no back arrow. */}
      <Link
        href="/"
        aria-label={t.back}
        className="touch-target inline-flex w-fit items-center justify-center rounded-full lg:hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-6" />
      </Link>
      <Logo className="lg:hidden" />
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          {t.login.title}
        </h1>
        <p className="text-lg text-fg-secondary">{t.login.lead}</p>
      </div>

      {passwordChanged && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-line bg-subtle p-4 font-semibold"
        >
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t.login.passwordChanged}
        </p>
      )}

      <form
        ref={formRef}
        action={formAction}
        noValidate
        className="flex flex-col gap-4"
      >
        <ErrorSummary title={t.errorSummaryTitle} errors={summary} />

        <div className="flex flex-col gap-2">
          <Label htmlFor={EMAIL_ID}>{t.fields.email}</Label>
          <Input
            id={EMAIL_ID}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            // React resets the form after the action: remount with the typed e-mail.
            key={state.email}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={
              fieldErrors.email ? `${EMAIL_ID}-error` : undefined
            }
          />
          {fieldErrors.email && (
            <FieldError id={`${EMAIL_ID}-error`}>
              {fieldErrors.email}
            </FieldError>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={PASSWORD_ID}>{t.fields.password}</Label>
          <PasswordInput
            id={PASSWORD_ID}
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={
              fieldErrors.password ? `${PASSWORD_ID}-error` : undefined
            }
          />
          {fieldErrors.password && (
            <FieldError id={`${PASSWORD_ID}-error`}>
              {fieldErrors.password}
            </FieldError>
          )}
        </div>

        <Link
          href={FORGOT_PASSWORD_PATH}
          className="touch-target inline-flex items-center self-end font-semibold text-brand-text underline"
        >
          {t.login.forgot}
        </Link>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.login.pending : t.login.submit}
        </Button>
      </form>

      <p className="flex flex-wrap items-center justify-center gap-x-2 text-fg-secondary">
        {t.login.noAccount}
        <Link
          href={SIGNUP_PATH}
          className="touch-target inline-flex items-center font-semibold text-brand-text underline"
        >
          {t.login.signup}
        </Link>
      </p>
    </div>
  );
}
