'use client';

import { CircleCheck } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ActionBar } from '@/components/ui/action-bar';
import { Button } from '@/components/ui/button';
import {
  ErrorSummary,
  FieldError,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PinPhoto } from '@/components/ui/pin-photo';
import { Textarea } from '@/components/ui/textarea';
import type { PinPickerProps } from '@/components/ui/pin-picker.client';
import { useUnsavedChanges } from '@/components/ui/unsaved-changes.client';
import { maskCnpj, maskWhatsapp } from '@/lib/masks';
import { isAcceptedNgoImage, NGO_IMAGE_TYPES } from '@/lib/ngo-image';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type {
  CepLookupResult,
  GeocodeAddressInput,
  GeocodeAddressResult,
  MyNgo,
  ProfileErrors,
  ProfileField,
  ProfileValues,
  UpdateProfileResult,
  UploadNgoImageResult,
} from '../ngo-account.types';
import { toProfileValues } from '../profile-values';
import { profileSchema, toProfileErrors } from '../schemas/profile.schema';
import { AddressFields } from './address-fields.client';
import { HoursFields } from './hours-fields.client';

const t = ngoAccountDictionary.profile;
const days = ngoAccountDictionary.hours.days;

const ADDRESS_PREFIX = 'profile-address';
const HOURS_PREFIX = 'profile-hours';
const ADDRESS_FIELDS: readonly ProfileField[] = [
  'cep',
  'street',
  'number',
  'complement',
  'district',
  'city',
  'uf',
  'location',
];
/** Same order as on the screen. */
const FIELDS: readonly ProfileField[] = [
  'legalName',
  'description',
  'email',
  'whatsapp',
  ...ADDRESS_FIELDS,
];
const NO_ERRORS: ProfileErrors = { fields: {}, hours: {} };

const fieldId = (field: ProfileField) =>
  ADDRESS_FIELDS.includes(field)
    ? `${ADDRESS_PREFIX}-${field}`
    : `profile-${field}`;

type ImageState =
  | { status: 'idle' | 'uploading' | 'done' }
  | { status: 'error'; message: string };

export interface ProfileFormProps {
  ngo: MyNgo;
  /** The `updateProfile` Server Action. */
  updateProfile: (values: ProfileValues) => Promise<UpdateProfileResult>;
  /** The `uploadNgoImage` Server Action. */
  uploadImage: (formData: FormData) => Promise<UploadNgoImageResult>;
  maxUploadMb: number;
  /** The `lookupCep` Server Action of `features/location`. */
  lookupCep: (cep: string) => Promise<CepLookupResult>;
  /** The `geocodeAddress` Server Action of `features/location`. */
  geocodeAddress: (
    address: GeocodeAddressInput,
  ) => Promise<GeocodeAddressResult>;
  /** `PinPicker`, loaded with `next/dynamic({ ssr: false })` in the app (PERF-01). */
  PinPicker: ComponentType<PinPickerProps>;
  tileUrl: string;
  attribution: string;
  /** The demo expiry notice (DEMO-06), given by the app. */
  notice?: React.ReactNode;
  /** Extra content under the contact fields, like the password change. */
  contactExtra?: React.ReactNode;
}

/**
 * `/painel/perfil` (PROF-01 to PROF-04): every signup field but the read-only
 * CNPJ. A new address needs the pin confirmed again before saving (PROF-03).
 */
export function ProfileForm({
  ngo,
  updateProfile,
  uploadImage,
  maxUploadMb,
  lookupCep,
  geocodeAddress,
  PinPicker,
  tileUrl,
  attribution,
  notice,
  contactExtra,
}: ProfileFormProps) {
  const [values, setValues] = useState(() => toProfileValues(ngo));
  /** The values last saved: the image is saved on its own, right away. */
  const [savedValues, setSavedValues] = useState(() =>
    JSON.stringify(toProfileValues(ngo)),
  );
  const [errors, setErrors] = useState(NO_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [imageUrl, setImageUrl] = useState(ngo.imageUrl);
  const [image, setImage] = useState<ImageState>({ status: 'idle' });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (attempt > 0) focusFirstError(formRef.current!);
  }, [attempt]);

  // DIRTY-01/02.
  useUnsavedChanges(JSON.stringify(values) !== savedValues);

  /** An edited field loses its error and the saved notice goes away. */
  function change(patch: Partial<ProfileValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setSaved(null);
    setErrors((current) => {
      const fields = { ...current.fields };
      for (const key of Object.keys(patch)) delete fields[key as ProfileField];
      const hours = 'openingHours' in patch ? {} : current.hours;
      return { fields, hours };
    });
  }

  function fail(next: ProfileErrors, message: string | null) {
    setErrors(next);
    setFormError(message);
    setAttempt((n) => n + 1);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(null);
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      fail(toProfileErrors(parsed.error, values), null);
      return;
    }

    setPending(true);
    const result = await updateProfile(values).catch(() => null);
    setPending(false);
    if (result?.ok) {
      setSavedValues(JSON.stringify(values));
      setErrors(NO_ERRORS);
      setFormError(null);
      setSaved(result.message);
      return;
    }
    fail(result?.errors ?? NO_ERRORS, result ? result.error : t.unavailable);
  }

  async function onImagePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isAcceptedNgoImage(file, maxUploadMb)) {
      setImage({
        status: 'error',
        message: ngoAccountDictionary.image.invalid(maxUploadMb),
      });
      return;
    }
    setImage({ status: 'uploading' });
    const body = new FormData();
    body.set('file', file);
    const result = await uploadImage(body).catch(() => null);
    if (result?.ok) {
      setImageUrl(result.imageUrl);
      setImage({ status: 'done' });
    } else {
      setImage({
        status: 'error',
        message: result ? result.error : ngoAccountDictionary.image.unavailable,
      });
    }
  }

  const summary: ErrorSummaryItem[] = [
    ...FIELDS.flatMap((field) => {
      const message = errors.fields[field];
      return message ? [{ fieldId: fieldId(field), message }] : [];
    }),
    ...[1, 2, 3, 4, 5, 6, 0].flatMap((day) => {
      const message = errors.hours[day];
      return message
        ? [
            {
              fieldId: `${HOURS_PREFIX}-${day}-opens`,
              message: t.dayError(days[day]!, message),
            },
          ]
        : [];
    }),
  ];

  const describedBy = (field: ProfileField, ...extra: string[]) =>
    [errors.fields[field] && `${fieldId(field)}-error`, ...extra]
      .filter(Boolean)
      .join(' ') || undefined;

  const fieldError = (field: ProfileField) =>
    errors.fields[field] && (
      <FieldError id={`${fieldId(field)}-error`}>
        {errors.fields[field]}
      </FieldError>
    );

  const textField = (
    field: 'legalName' | 'email' | 'whatsapp',
    options: { autoComplete: string; type?: string; hint?: string },
  ) => {
    const hintId = `${fieldId(field)}-hint`;
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId(field)}>{t[field]}</Label>
        <Input
          id={fieldId(field)}
          name={field}
          type={options.type}
          inputMode={field === 'whatsapp' ? 'tel' : undefined}
          spellCheck={field === 'email' ? false : undefined}
          autoComplete={options.autoComplete}
          value={values[field]}
          onChange={(e) =>
            change({
              [field]:
                field === 'whatsapp'
                  ? maskWhatsapp(e.target.value)
                  : e.target.value,
            })
          }
          aria-invalid={errors.fields[field] ? true : undefined}
          aria-describedby={
            options.hint ? describedBy(field, hintId) : describedBy(field)
          }
        />
        {options.hint && (
          <p id={hintId} className="text-sm text-fg-secondary">
            {options.hint}
          </p>
        )}
        {fieldError(field)}
      </div>
    );
  };

  const sectionTitle = (title: string, lead: string) => (
    <div className="flex flex-col gap-1">
      <h2 className="font-heading text-2xl font-bold">{title}</h2>
      <p className="text-sm text-fg-secondary">{lead}</p>
    </div>
  );

  const imageInputId = 'profile-image';
  const imageHintId = `${imageInputId}-hint`;
  const imageErrorId = `${imageInputId}-error`;

  return (
    <div className="flex flex-col gap-8">
      {/* On the phone the page's app bar shows the title (C-12). */}
      <h1 className="font-heading text-3xl font-extrabold tracking-tight max-lg:sr-only">
        {t.title}
      </h1>
      {notice}

      <div role="status">
        {saved && (
          <p className="flex items-center gap-2 rounded-card bg-available-soft p-4 font-semibold text-available-fg">
            <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
            {saved}
          </p>
        )}
      </div>

      <section
        aria-labelledby="profile-image-title"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="profile-image-title"
            className="font-heading text-2xl font-bold"
          >
            {t.imageTitle}
          </h2>
          <p className="text-sm text-fg-secondary">{t.imageLead}</p>
        </div>
        <input
          id={imageInputId}
          type="file"
          accept={NGO_IMAGE_TYPES.join(',')}
          onChange={(e) => void onImagePicked(e)}
          disabled={image.status === 'uploading'}
          aria-labelledby={`${imageInputId}-label`}
          aria-describedby={
            image.status === 'error'
              ? `${imageHintId} ${imageErrorId}`
              : imageHintId
          }
          aria-invalid={image.status === 'error' ? true : undefined}
          className="peer sr-only"
        />
        <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 peer-focus-visible:ring-3 peer-focus-visible:ring-ring">
          {imageUrl && (
            <PinPhoto
              width={64}
              image={
                <img src={imageUrl} alt={t.imageAlt} width={64} height={83} />
              }
            />
          )}
          <div className="flex min-w-0 flex-col items-start gap-1">
            <label
              id={`${imageInputId}-label`}
              htmlFor={imageInputId}
              className="touch-target inline-flex cursor-pointer items-center font-semibold text-brand-text underline"
            >
              {imageUrl ? t.imageChange : t.imagePick}
            </label>
            <p id={imageHintId} className="text-sm text-fg-secondary">
              {t.imageHint(maxUploadMb)}
            </p>
          </div>
        </div>
        <div role="status" className="text-sm">
          {image.status === 'uploading' && (
            <span className="text-fg-secondary">{t.imageUploading}</span>
          )}
          {image.status === 'done' && (
            <span className="font-semibold text-available-fg">
              {t.imageUploaded}
            </span>
          )}
        </div>
        {image.status === 'error' && (
          <FieldError id={imageErrorId}>{image.message}</FieldError>
        )}
      </section>

      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => void onSubmit(e)}
        className="flex flex-col gap-8"
      >
        <ErrorSummary title={t.errorSummaryTitle} errors={summary} />
        {formError && summary.length === 0 && (
          <p
            role="alert"
            className="rounded-2xl border border-error bg-error-soft p-4 font-semibold text-error-fg"
          >
            {formError}
          </p>
        )}

        <section className="flex flex-col gap-5">
          {sectionTitle(t.dataTitle, t.dataLead)}
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-cnpj">{t.cnpj}</Label>
            <Input
              id="profile-cnpj"
              name="cnpj"
              value={maskCnpj(ngo.cnpj)}
              readOnly
              aria-describedby="profile-cnpj-hint"
              className="bg-surface-2"
            />
            <p id="profile-cnpj-hint" className="text-sm text-fg-secondary">
              {t.cnpjHint}
            </p>
          </div>
          {textField('legalName', { autoComplete: 'organization' })}
          <div className="flex flex-col gap-2">
            <Label htmlFor={fieldId('description')}>{t.description}</Label>
            <Textarea
              id={fieldId('description')}
              name="description"
              rows={5}
              value={values.description}
              onChange={(e) => change({ description: e.target.value })}
              aria-invalid={errors.fields.description ? true : undefined}
              aria-describedby={describedBy('description', 'profile-counter')}
            />
            <p id="profile-counter" className="text-sm text-fg-secondary">
              {t.counter(values.description.length)}
            </p>
            {fieldError('description')}
          </div>
        </section>

        <section className="flex flex-col gap-5">
          {sectionTitle(t.contactTitle, t.contactLead)}
          {textField('email', { autoComplete: 'email', type: 'email' })}
          {textField('whatsapp', { autoComplete: 'tel', hint: t.whatsappHint })}
          {contactExtra}
        </section>

        <section className="flex flex-col gap-5">
          {sectionTitle(t.addressTitle, t.addressLead)}
          <AddressFields
            values={values}
            onChange={change}
            errors={errors.fields}
            idPrefix={ADDRESS_PREFIX}
            lookupCep={lookupCep}
            geocodeAddress={geocodeAddress}
            PinPicker={PinPicker}
            tileUrl={tileUrl}
            attribution={attribution}
            savedReadOnly
          />
        </section>

        <section className="flex flex-col gap-5">
          {sectionTitle(t.hoursTitle, t.hoursLead)}
          <HoursFields
            values={values.openingHours}
            onChange={(openingHours) => change({ openingHours })}
            errors={errors.hours}
            idPrefix={HOURS_PREFIX}
          />
        </section>

        <ActionBar>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? t.pending : t.submit}
          </Button>
        </ActionBar>
      </form>
    </div>
  );
}
