'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useUnsavedChanges } from '@/components/ui/unsaved-changes.client';
import { checkCnpj, checkEmail } from './actions/check-availability';
import { EMPTY_SIGNUP, useSignup } from './components/signup-provider.client';
import { StepAbout } from './components/step-about.client';
import {
  StepAddress,
  type AddressSlot,
} from './components/step-address.client';
import { StepContact } from './components/step-contact.client';
import { StepHours, type HoursSlot } from './components/step-hours.client';
import { StepReview } from './components/step-review.client';
import { firstPendingStep } from './pending-step';
import { signupDictionary } from './signup.dictionary';
import type {
  AddressValues,
  CreateAccountError,
  DayValues,
  SignupSlug,
  SignupStep,
} from './signup.types';
import { SIGNUP_BASE_PATH, SIGNUP_STEPS, stepPath } from './steps';

const EMPTY_JSON = JSON.stringify(EMPTY_SIGNUP);

export interface AddressFieldsSlot extends AddressSlot {
  values: AddressValues;
  onChange: (values: Partial<AddressValues>) => void;
}

export interface HoursFieldsSlot extends HoursSlot {
  values: DayValues[];
  onChange: (openingHours: DayValues[]) => void;
}

export interface SignupWizardProps {
  slug: SignupSlug;
  /** MAX_UPLOAD_MB (SIGN-10). */
  maxUploadMb: number;
  /** From GET /demo (DEMO-03, DEMO-20; `locked`: AD-008). */
  demo: { enabled: boolean; retentionDays: number; locked?: boolean };
  /** `createAccount` bound to the image upload, by the app. Opens /painel on success. */
  createAccount: (
    formData: FormData,
  ) => Promise<CreateAccountError | undefined>;
  /** The AddressFields of `features/ngo-account` (a feature doesn't import another). */
  renderAddressFields: (slot: AddressFieldsSlot) => React.ReactNode;
  /** The HoursFields of `features/ngo-account`. */
  renderHoursFields: (slot: HoursFieldsSlot) => React.ReactNode;
}

/**
 * The step of the URL, wired to the SignupProvider and the router. Kept out of
 * `components/` because Storybook can't mount the App Router (ARCHITECTURE.md §9).
 */
export function SignupWizard({
  slug,
  maxUploadMb,
  demo,
  createAccount,
  renderAddressFields,
  renderHoursFields,
}: SignupWizardProps) {
  const router = useRouter();
  const signup = useSignup();
  const { data, ready, update, conflict, setConflict, reset } = signup;
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();
  const created = useRef(false);

  const index = SIGNUP_STEPS.findIndex((s) => s.slug === slug);
  const step = SIGNUP_STEPS[index]!.step;
  // SIGN-01: a step opened from the URL needs the ones before it.
  const pending = ready ? firstPendingStep(data, step) : null;

  useEffect(() => {
    if (pending) router.replace(stepPath(pending));
  }, [pending, router]);

  // Leaving the wizard after "Criar conta" worked: forget it (sessionStorage included).
  useEffect(
    () => () => {
      if (created.current) reset();
    },
    [reset],
  );

  // DIRTY-01/02: a draft counts until "Criar conta" goes out. Moving between
  // the steps keeps it (only the links that leave the wizard ask).
  const hasDraft = signup.image !== null || JSON.stringify(data) !== EMPTY_JSON;
  useUnsavedChanges(ready && hasDraft && !submitting);

  if (!ready || pending) return null;

  const go = (to: SignupStep) => router.push(stepPath(to));
  const next = () => go(SIGNUP_STEPS[index + 1]!.step);
  const back = () => go(SIGNUP_STEPS[index - 1]!.step);
  /** Leaving the step of a conflict clears it. */
  const nextClearing = () => {
    setConflict(null);
    next();
  };

  async function submit() {
    setSubmitting(true);
    setFormError(undefined);
    const formData = new FormData();
    formData.set(
      'data',
      JSON.stringify({ ...data, signupRequestId: signup.signupRequestId }),
    );
    if (signup.image) formData.set('image', signup.image);

    created.current = true;
    const result = await createAccount(formData).catch(() => ({
      ok: false as const,
      step: null,
      error: signupDictionary.create.unavailable,
    }));
    // A redirect to /painel leaves nothing to show.
    if (!result) return;

    created.current = false;
    setSubmitting(false);
    if (result.step) {
      // SIGN-31: back to the step of the field, with the error on it.
      if (result.field)
        setConflict({ field: result.field, error: result.error });
      router.push(`${SIGNUP_BASE_PATH}/${result.step}`);
    } else {
      setFormError(result.error);
    }
  }

  switch (step) {
    case 'about':
      return (
        <StepAbout
          values={data.about}
          onChange={(values) => update('about', values)}
          image={signup.image}
          onImageChange={signup.setImage}
          maxUploadMb={maxUploadMb}
          checkCnpj={checkCnpj}
          onContinue={nextClearing}
          serverError={conflict?.field === 'cnpj' ? conflict.error : undefined}
        />
      );
    case 'contact':
      return (
        <StepContact
          values={data.contact}
          onChange={(values) => update('contact', values)}
          checkEmail={checkEmail}
          onContinue={nextClearing}
          onBack={back}
          serverError={conflict?.field === 'email' ? conflict.error : undefined}
        />
      );
    case 'address':
      return (
        <StepAddress
          values={data.address}
          renderFields={(slot) =>
            renderAddressFields({
              ...slot,
              values: data.address,
              onChange: (values) => update('address', values),
            })
          }
          onContinue={next}
          onBack={back}
        />
      );
    case 'hours':
      return (
        <StepHours
          values={data.hours}
          renderFields={(slot) =>
            renderHoursFields({
              ...slot,
              values: data.hours.openingHours,
              onChange: (openingHours) => update('hours', { openingHours }),
            })
          }
          onContinue={next}
          onBack={back}
        />
      );
    default:
      return (
        <StepReview
          data={data}
          image={signup.image}
          onChange={(values) => update('review', values)}
          demo={demo}
          onSubmit={() => void submit()}
          onBack={back}
          pending={submitting}
          formError={formError}
        />
      );
  }
}
