'use client';

import { GuardedLink } from '@/components/ui/unsaved-changes.client';
import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '@/components/ui/action-bar';
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
import { PasswordRules } from '@/components/ui/password-rules';
import { maskWhatsapp } from '@/lib/masks';
import { contactSchema } from '../schemas/signup.schema';
import { signupDictionary } from '../signup.dictionary';
import type { AvailabilityResult, ContactValues } from '../signup.types';

const t = signupDictionary;

export const LOGIN_PATH = '/entrar';
export const RECOVER_PASSWORD_PATH = '/recuperar-senha';

type Field = keyof ContactValues;
const FIELDS: readonly Field[] = [
  'email',
  'whatsapp',
  'password',
  'confirmation',
];
const IDS: Record<Field, string> = {
  email: 'signup-email',
  whatsapp: 'signup-whatsapp',
  password: 'signup-password',
  confirmation: 'signup-confirmation',
};
const WHATSAPP_HINT_ID = 'signup-whatsapp-hint';
const EMAIL_NOTICE_ID = 'signup-email-notice';
const RULES_ID = 'signup-password-rules';

const blocks = (result: AvailabilityResult) =>
  result.status === 'taken' || result.status === 'invalid';

export interface StepContactProps {
  /** Values kept by the SignupProvider; the WhatsApp as typed, with the mask. */
  values: ContactValues;
  onChange: (values: Partial<ContactValues>) => void;
  /** The `checkEmail` Server Action (SIGN-12). */
  checkEmail: (email: string) => Promise<AvailabilityResult>;
  /** Called when the step is valid. */
  onContinue: () => void;
  /** The e-mail taken at the final submit (SIGN-31), shown on the field from the start. */
  serverError?: string;
  onBack: () => void;
}

/** Step 2 of the signup (SIGN-11 to SIGN-16). */
export function StepContact({
  values,
  onChange,
  checkEmail,
  onContinue,
  onBack,
  serverError,
}: StepContactProps) {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [taken, setTaken] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  // Blur and submit ask the api once per e-mail.
  const checked = useRef<{ email: string; result: AvailabilityResult }>(null);
  const currentEmail = useRef(values.email);
  currentEmail.current = values.email;

  useEffect(() => {
    if (attempt > 0) focusFirstError(formRef.current!);
  }, [attempt]);

  // An effect, not the initial state: Next may show this step again from a hidden
  // <Activity>, with its old state, when the final submit sends the NGO back.
  useEffect(() => {
    if (!serverError) return;
    // The api said taken after the check said free: ask again on the next submit.
    checked.current = null;
    setTaken(true);
    setErrors((current) => ({ ...current, email: serverError }));
  }, [serverError]);

  async function verify(email: string): Promise<AvailabilityResult> {
    const trimmed = email.trim();
    if (checked.current?.email !== trimmed) {
      checked.current = { email: trimmed, result: await checkEmail(trimmed) };
    }
    return checked.current.result;
  }

  /** Shows the answer; returns the field error, if it blocks the step. */
  function showCheck(result: AvailabilityResult): string | undefined {
    setTaken(result.status === 'taken');
    setEmailNotice(result.status === 'unchecked' ? result.error : undefined);
    return blocks(result) ? result.error : undefined;
  }

  function change(field: Field, value: string) {
    setErrors(({ [field]: _removed, ...rest }) => rest);
    if (field === 'email') {
      setTaken(false);
      setEmailNotice(undefined);
    }
    onChange({ [field]: field === 'whatsapp' ? maskWhatsapp(value) : value });
  }

  async function onEmailBlur() {
    const email = values.email;
    if (!contactSchema.shape.email.safeParse(email).success) return;
    const result = await verify(email);
    // The NGO may have typed another e-mail meanwhile.
    if (currentEmail.current !== email) return;
    const error = showCheck(result);
    if (error) setErrors((e) => ({ ...e, email: error }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = contactSchema.safeParse(values);
    const next: Partial<Record<Field, string>> = {};
    for (const issue of parsed.error?.issues ?? []) {
      const field = issue.path[0] as Field;
      next[field] ??= issue.message;
    }

    if (!next.email) {
      setChecking(true);
      const error = showCheck(await verify(values.email));
      setChecking(false);
      if (error) next.email = error;
    }

    setErrors(next);
    if (Object.keys(next).length === 0) onContinue();
    else setAttempt((n) => n + 1);
  }

  // A11Y-05: the summary belongs to a submit; a blur check shows on the field only.
  const summary: ErrorSummaryItem[] =
    attempt === 0
      ? []
      : FIELDS.flatMap((field) => {
          const message = errors[field];
          return message ? [{ fieldId: IDS[field], message }] : [];
        });

  const describedBy = (field: Field, ...extra: (string | false)[]) =>
    [errors[field] && `${IDS[field]}-error`, ...extra]
      .filter(Boolean)
      .join(' ') || undefined;

  const fieldError = (field: Field) =>
    errors[field] && (
      <FieldError id={`${IDS[field]}-error`}>{errors[field]}</FieldError>
    );

  const linkClass =
    'touch-target inline-flex items-center font-semibold text-brand-text underline';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {t.contact.title}
        </h1>
        <p className="text-lg text-fg-secondary">{t.contact.lead}</p>
      </div>

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
      >
        <ErrorSummary title={t.errorSummaryTitle} errors={summary} />

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.email}>{t.contact.email}</Label>
          <Input
            id={IDS.email}
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => change('email', e.target.value)}
            onBlur={onEmailBlur}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy(
              'email',
              emailNotice !== undefined && EMAIL_NOTICE_ID,
            )}
          />
          {fieldError('email')}
          {emailNotice && (
            <p id={EMAIL_NOTICE_ID} className="text-sm text-fg-secondary">
              {emailNotice}
            </p>
          )}
          {taken && (
            <div className="flex flex-wrap gap-x-6">
              <GuardedLink
                href={`${LOGIN_PATH}?email=${encodeURIComponent(values.email.trim())}`}
                className={linkClass}
              >
                {t.contact.loginWithEmail}
              </GuardedLink>
              <GuardedLink href={RECOVER_PASSWORD_PATH} className={linkClass}>
                {t.contact.recoverPassword}
              </GuardedLink>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.whatsapp}>{t.contact.whatsapp}</Label>
          <Input
            id={IDS.whatsapp}
            name="whatsapp"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={values.whatsapp}
            onChange={(e) => change('whatsapp', e.target.value)}
            aria-invalid={errors.whatsapp ? true : undefined}
            aria-describedby={describedBy('whatsapp', WHATSAPP_HINT_ID)}
          />
          <p id={WHATSAPP_HINT_ID} className="text-sm text-fg-secondary">
            {t.contact.whatsappHint}
          </p>
          {fieldError('whatsapp')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.password}>{t.contact.password}</Label>
          <PasswordInput
            id={IDS.password}
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => change('password', e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={describedBy('password', RULES_ID)}
          />
          {fieldError('password')}
          <PasswordRules
            id={RULES_ID}
            password={values.password}
            title={t.contact.rulesTitle}
            metLabel={t.contact.ruleMet}
            unmetLabel={t.contact.ruleUnmet}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.confirmation}>{t.contact.confirmation}</Label>
          <PasswordInput
            id={IDS.confirmation}
            name="confirmation"
            autoComplete="new-password"
            value={values.confirmation}
            onChange={(e) => change('confirmation', e.target.value)}
            aria-invalid={errors.confirmation ? true : undefined}
            aria-describedby={describedBy('confirmation')}
          />
          {fieldError('confirmation')}
        </div>

        <ActionBar>
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            {t.contact.back}
          </Button>
          <Button type="submit" size="lg" disabled={checking}>
            {checking ? t.contact.checking : t.contact.submit}
          </Button>
        </ActionBar>
      </form>
    </div>
  );
}
