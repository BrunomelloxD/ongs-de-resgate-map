'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ActionBar } from '@/components/ui/action-bar';
import { Button } from '@/components/ui/button';
import { PinPhoto } from '@/components/ui/pin-photo';
import { signupDictionary } from '../signup.dictionary';
import type { ReviewValues, SignupData, SignupStep } from '../signup.types';
import { stepPath } from '../steps';

const t = signupDictionary;

export const TERMS_PATH = '/termos';
export const PRIVACY_PATH = '/privacidade';

/** Monday first, Sunday last, like the hours step. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface StepReviewProps {
  data: SignupData;
  /** NGO image kept in memory, shown as in step 1. */
  image: File | null;
  onChange: (values: Partial<ReviewValues>) => void;
  /** From GET /demo: the demo acceptance only exists while the demo is on (DEMO-03, DEMO-20). */
  demo: { enabled: boolean; retentionDays: number };
  /** Called on "Criar conta" with every acceptance in place. */
  onSubmit: () => void;
  onBack: () => void;
  /** True while `createAccount` runs. */
  pending?: boolean;
  /** Error of the last try that stayed on this step (DEMO-07, DEMO-08). */
  formError?: string;
}

function Section({
  title,
  step,
  children,
}: {
  title: string;
  step: SignupStep;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold">{title}</h2>
        <Link
          href={stepPath(step)}
          aria-label={t.review.editLabel(title)}
          className="touch-target inline-flex items-center font-semibold text-brand-text underline"
        >
          {t.review.edit}
        </Link>
      </div>
      <dl className="flex flex-col gap-3">{children}</dl>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-fg-secondary">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

/** Step 5 of the signup (SIGN-26, SIGN-27, DEMO-03, DEMO-20). */
export function StepReview({
  data,
  image,
  onChange,
  demo,
  onSubmit,
  onBack,
  pending = false,
  formError,
}: StepReviewProps) {
  const [preview, setPreview] = useState<string>();
  const { about, contact, address, hours, review } = data;

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const accepted =
    review.termsAccepted && (!demo.enabled || review.demoAccepted);
  const complement = address.complement.trim();
  const addressLine = `${address.street}, ${address.number}${
    complement ? ` – ${complement}` : ''
  } · ${address.district}, ${address.city} – ${address.uf} · ${address.cep}`;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accepted && !pending) onSubmit();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {t.review.title}
        </h1>
        <p className="text-lg text-fg-secondary">{t.review.lead}</p>
      </div>

      <Section title={t.review.about} step="about">
        {image && preview && (
          <PinPhoto
            width={56}
            image={
              <img src={preview} alt={t.review.image} width={56} height={73} />
            }
          />
        )}
        <Item label={t.review.cnpj} value={about.cnpj} />
        <Item label={t.review.legalName} value={about.legalName} />
        <Item label={t.review.description} value={about.description} />
      </Section>

      <Section title={t.review.contact} step="contact">
        <Item label={t.review.email} value={contact.email} />
        <Item label={t.review.whatsapp} value={contact.whatsapp} />
      </Section>

      <Section title={t.review.address} step="address">
        <Item label={t.review.address} value={addressLine} />
      </Section>

      <Section title={t.review.hours} step="hours">
        {WEEK_ORDER.map((dayOfWeek) => {
          const day = hours.openingHours.find(
            (d) => d.dayOfWeek === dayOfWeek,
          )!;
          return (
            <Item
              key={dayOfWeek}
              label={t.hours.days[dayOfWeek]!}
              value={
                day.closed
                  ? t.review.closed
                  : t.review.interval(day.opensAt!, day.closesAt!)
              }
            />
          );
        })}
      </Section>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <input
            id="signup-terms"
            type="checkbox"
            checked={review.termsAccepted}
            onChange={(e) => onChange({ termsAccepted: e.target.checked })}
            className="mt-0.5 size-6 shrink-0 accent-brand-deep"
          />
          <label htmlFor="signup-terms" className="min-h-11">
            {t.review.termsBefore}
            <Link
              href={TERMS_PATH}
              target="_blank"
              className="font-semibold text-brand-text underline"
            >
              {t.review.terms}
            </Link>
            {t.review.termsBetween}
            <Link
              href={PRIVACY_PATH}
              target="_blank"
              className="font-semibold text-brand-text underline"
            >
              {t.review.privacy}
            </Link>
            {t.review.termsAfter}
          </label>
        </div>

        {demo.enabled && (
          <div className="flex items-start gap-3">
            <input
              id="signup-demo"
              type="checkbox"
              checked={review.demoAccepted}
              onChange={(e) => onChange({ demoAccepted: e.target.checked })}
              className="mt-0.5 size-6 shrink-0 accent-brand-deep"
            />
            <label htmlFor="signup-demo" className="min-h-11">
              {t.review.demo(demo.retentionDays)}
            </label>
          </div>
        )}

        {formError && (
          <p
            role="alert"
            className="rounded-2xl border border-error bg-error-soft p-4 font-semibold text-error-fg"
          >
            {formError}
          </p>
        )}

        <ActionBar>
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            {t.review.back}
          </Button>
          <Button type="submit" size="lg" disabled={!accepted || pending}>
            {pending ? t.review.pending : t.review.submit}
          </Button>
        </ActionBar>
      </form>
    </div>
  );
}
