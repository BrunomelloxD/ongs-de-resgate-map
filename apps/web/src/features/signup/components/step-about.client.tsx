'use client';

import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ErrorSummary,
  FieldError,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidCnpj, maskCnpj, normalizeCnpj } from '@/lib/masks';
import { isAcceptedNgoImage } from '@/lib/ngo-image';
import { aboutSchema } from '../schemas/signup.schema';
import { signupDictionary } from '../signup.dictionary';
import type { AboutValues, AvailabilityResult } from '../signup.types';

const t = signupDictionary;

type Field = keyof AboutValues;
const FIELDS: readonly Field[] = ['cnpj', 'legalName', 'description'];
const IDS: Record<Field, string> = {
  cnpj: 'signup-cnpj',
  legalName: 'signup-legal-name',
  description: 'signup-description',
};
const CNPJ_HINT_ID = 'signup-cnpj-hint';
const COUNTER_ID = 'signup-description-counter';
const IMAGE_ID = 'signup-image';
const IMAGE_LABEL_ID = 'signup-image-label';
const IMAGE_HINT_ID = 'signup-image-hint';

const blocks = (result: AvailabilityResult) =>
  result.status === 'taken' || result.status === 'invalid';

export interface StepAboutProps {
  /** Values kept by the SignupProvider; the CNPJ as typed, with the mask. */
  values: AboutValues;
  onChange: (values: Partial<AboutValues>) => void;
  /** Accepted image, kept in memory until "Criar conta". */
  image: File | null;
  onImageChange: (image: File | null) => void;
  /** MAX_UPLOAD_MB (SIGN-10). */
  maxUploadMb: number;
  /** The `checkCnpj` Server Action (SIGN-05). */
  checkCnpj: (cnpj: string) => Promise<AvailabilityResult>;
  /** Called when the step is valid. */
  onContinue: () => void;
  /** The CNPJ taken at the final submit (SIGN-31), shown on the field from the start. */
  serverError?: string;
}

/** Step 1 of the signup (SIGN-03 to SIGN-10). */
export function StepAbout({
  values,
  onChange,
  image,
  onImageChange,
  maxUploadMb,
  checkCnpj,
  onContinue,
  serverError,
}: StepAboutProps) {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [cnpjNotice, setCnpjNotice] = useState<string>();
  const [imageError, setImageError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  // Blur and submit ask the api once per CNPJ.
  const checked = useRef<{ cnpj: string; result: AvailabilityResult }>(null);
  const currentCnpj = useRef(values.cnpj);
  currentCnpj.current = values.cnpj;

  useEffect(() => {
    if (attempt > 0) focusFirstError(formRef.current!);
  }, [attempt]);

  // An effect, not the initial state: Next may show this step again from a hidden
  // <Activity>, with its old state, when the final submit sends the NGO back.
  useEffect(() => {
    if (!serverError) return;
    // The api said taken after the check said free: ask again on the next submit.
    checked.current = null;
    setErrors((current) => ({ ...current, cnpj: serverError }));
  }, [serverError]);

  // SIGN-09: square preview of the chosen file, before any upload.
  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function verify(cnpj: string): Promise<AvailabilityResult> {
    const normalized = normalizeCnpj(cnpj);
    if (checked.current?.cnpj !== normalized) {
      checked.current = {
        cnpj: normalized,
        result: await checkCnpj(normalized),
      };
    }
    return checked.current.result;
  }

  function showCheck(result: AvailabilityResult) {
    setCnpjNotice(result.status === 'unchecked' ? result.error : undefined);
    if (blocks(result)) setErrors((e) => ({ ...e, cnpj: result.error }));
  }

  function change(field: Field, value: string) {
    setErrors(({ [field]: _removed, ...rest }) => rest);
    if (field === 'cnpj') setCnpjNotice(undefined);
    onChange({ [field]: field === 'cnpj' ? maskCnpj(value) : value });
  }

  async function onCnpjBlur() {
    const cnpj = values.cnpj;
    if (!isValidCnpj(normalizeCnpj(cnpj))) return;
    const result = await verify(cnpj);
    // The NGO may have typed another CNPJ meanwhile.
    if (currentCnpj.current === cnpj) showCheck(result);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = aboutSchema.safeParse(values);
    const next: Partial<Record<Field, string>> = {};
    for (const issue of parsed.error?.issues ?? []) {
      const field = issue.path[0] as Field;
      next[field] ??= issue.message;
    }

    if (!next.cnpj) {
      setChecking(true);
      const result = await verify(values.cnpj);
      setChecking(false);
      setCnpjNotice(result.status === 'unchecked' ? result.error : undefined);
      if (blocks(result)) next.cnpj = result.error;
    }

    setErrors(next);
    if (Object.keys(next).length === 0) onContinue();
    else setAttempt((n) => n + 1);
  }

  function onImagePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Lets the NGO pick the same file again after removing it.
    event.target.value = '';
    if (!file) return;
    if (!isAcceptedNgoImage(file, maxUploadMb)) {
      setImageError(t.about.imageInvalid(maxUploadMb));
      return;
    }
    setImageError(undefined);
    onImageChange(file);
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
      .join(' ');

  const fieldError = (field: Field) =>
    errors[field] && (
      <FieldError id={`${IDS[field]}-error`}>{errors[field]}</FieldError>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {t.about.title}
        </h1>
        <p className="text-lg text-fg-secondary">{t.about.lead}</p>
      </div>

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
      >
        <ErrorSummary title={t.errorSummaryTitle} errors={summary} />

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.cnpj}>{t.about.cnpj}</Label>
          <Input
            id={IDS.cnpj}
            name="cnpj"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={values.cnpj}
            onChange={(e) => change('cnpj', e.target.value)}
            onBlur={onCnpjBlur}
            aria-invalid={errors.cnpj ? true : undefined}
            aria-describedby={describedBy('cnpj', CNPJ_HINT_ID)}
          />
          <p id={CNPJ_HINT_ID} className="text-sm text-fg-secondary">
            {cnpjNotice ?? t.about.cnpjHint}
          </p>
          {fieldError('cnpj')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.legalName}>{t.about.legalName}</Label>
          <Input
            id={IDS.legalName}
            name="legalName"
            autoComplete="organization"
            value={values.legalName}
            onChange={(e) => change('legalName', e.target.value)}
            aria-invalid={errors.legalName ? true : undefined}
            aria-describedby={describedBy('legalName') || undefined}
          />
          {fieldError('legalName')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.description}>{t.about.description}</Label>
          <textarea
            id={IDS.description}
            name="description"
            rows={5}
            value={values.description}
            onChange={(e) => change('description', e.target.value)}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describedBy('description', COUNTER_ID)}
            className="min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
          />
          <p id={COUNTER_ID} className="text-sm text-fg-secondary">
            {t.about.counter(values.description.length)}
          </p>
          {fieldError('description')}
        </div>

        <div className="flex flex-col gap-2">
          <span id={IMAGE_LABEL_ID} className="text-sm font-medium">
            {t.about.image}
          </span>
          <input
            id={IMAGE_ID}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onImagePicked}
            aria-labelledby={IMAGE_LABEL_ID}
            aria-describedby={[IMAGE_HINT_ID, imageError && `${IMAGE_ID}-error`]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={imageError ? true : undefined}
            className="peer sr-only"
          />
          {image && preview ? (
            <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 peer-focus-visible:ring-3 peer-focus-visible:ring-ring">
              <img
                src={preview}
                alt={t.about.imagePreview}
                className="size-20 shrink-0 rounded-xl object-cover"
              />
              <div className="flex min-w-0 flex-col items-start gap-1">
                <p className="truncate font-semibold">{image.name}</p>
                <label
                  htmlFor={IMAGE_ID}
                  className="touch-target inline-flex cursor-pointer items-center font-semibold text-brand-text underline"
                >
                  {t.about.imageChange}
                </label>
                <button
                  type="button"
                  onClick={() => onImageChange(null)}
                  className="touch-target inline-flex items-center font-semibold underline"
                >
                  {t.about.imageRemove}
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor={IMAGE_ID}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-input p-6 text-center peer-focus-visible:ring-3 peer-focus-visible:ring-ring"
            >
              <Upload aria-hidden="true" className="size-8 text-brand-deep" />
              <span className="font-semibold">{t.about.imagePick}</span>
            </label>
          )}
          <p id={IMAGE_HINT_ID} className="text-sm text-fg-secondary">
            {t.about.imageHint(maxUploadMb)}
          </p>
          {imageError && (
            <FieldError id={`${IMAGE_ID}-error`}>{imageError}</FieldError>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={checking}
          className="rounded-full text-base font-semibold"
        >
          {checking ? t.about.checking : t.about.submit}
        </Button>
      </form>
    </div>
  );
}
