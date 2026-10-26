'use client';

import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PinPhoto } from '@/components/ui/pin-photo';
import {
  ErrorSummary,
  FieldError,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnnounce } from '@/components/ui/live-region.client';
import { authDictionary as t } from '../auth.dictionary';
import type { ForgotPasswordState } from '../auth.types';

/** AUTH-10: "Reenviar" waits 60 s after each sent link. */
export const RESEND_COOLDOWN_MS = 60_000;
export const LOGIN_PATH = '/entrar';

const EMAIL_ID = 'forgot-email';

export interface ForgotPasswordFormProps {
  /** The `requestPasswordReset` Server Action. */
  action: (
    state: ForgotPasswordState,
    formData: FormData,
  ) => Promise<ForgotPasswordState>;
}

const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** AUTH-08 to AUTH-11: asks for the link, then counts down to "Reenviar". */
export function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  const announce = useAnnounce();
  const [cooldownEnd, setCooldownEnd] = useState(0);
  // Starts at 0, like the cooldown: Date.now() can't run in the prerender.
  const [now, setNow] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: ForgotPasswordState, formData: FormData) => {
      const next = await action(previous, formData);
      if (next.sentMessage) {
        const sentAt = Date.now();
        setNow(sentAt);
        setCooldownEnd(sentAt + RESEND_COOLDOWN_MS);
        announce(next.sentMessage);
      }
      return next;
    },
    { email: '' },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const remaining = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= cooldownEnd) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  // The tapped button is gone after the switch: keep focus on the new screen.
  useEffect(() => {
    if (state.sentMessage) headingRef.current!.focus();
    else focusFirstError(formRef.current!);
  }, [state]);

  if (state.sentMessage) {
    return (
      <div className="flex flex-col gap-6">
        <PinPhoto
          width={64}
          icon={<Mail className="size-7" />}
          className="bg-brand-deep text-brand"
        />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-4xl font-extrabold tracking-tight outline-none"
        >
          {t.forgot.sentTitle}
        </h1>
        <div className="flex flex-col gap-2 text-lg">
          <p>{state.sentMessage}</p>
          <p className="text-fg-secondary">{t.forgot.sentHint}</p>
        </div>
        <Link
          href={LOGIN_PATH}
          className="touch-target inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 font-semibold text-on-brand"
        >
          {t.forgot.backToLogin}
        </Link>
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="email" value={state.email} />
          <span className="text-fg-secondary">{t.forgot.notArrived}</span>
          <Button
            type="submit"
            variant="ghost"
            disabled={pending || remaining > 0}
            className="text-base font-semibold"
          >
            {remaining > 0
              ? t.forgot.resendIn(mmss(remaining))
              : t.forgot.resend}
          </Button>
        </form>
      </div>
    );
  }

  const fieldError = state.fieldError ?? state.formError;
  const summary: ErrorSummaryItem[] = fieldError
    ? [{ fieldId: EMAIL_ID, message: fieldError }]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={LOGIN_PATH}
        aria-label={t.back}
        className="touch-target inline-flex w-fit items-center justify-center rounded-full lg:hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-6" />
      </Link>
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          {t.forgot.title}
        </h1>
        <p className="text-lg text-fg-secondary">{t.forgot.lead}</p>
      </div>

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
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={
              state.fieldError ? `${EMAIL_ID}-error` : undefined
            }
          />
          {state.fieldError && (
            <FieldError id={`${EMAIL_ID}-error`}>{state.fieldError}</FieldError>
          )}
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.forgot.pending : t.forgot.submit}
        </Button>
      </form>

      <Link
        href={LOGIN_PATH}
        className="touch-target inline-flex w-fit items-center font-semibold text-brand-text underline"
      >
        {t.forgot.backToLogin}
      </Link>
    </div>
  );
}
