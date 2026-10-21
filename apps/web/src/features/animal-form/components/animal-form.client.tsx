'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  ErrorSummary,
  FieldError,
  focusFirstError,
  type ErrorSummaryItem,
} from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { animalFormDictionary } from '../animal-form.dictionary';
import type {
  AnimalField,
  AnimalFormValues,
  DeleteAnimal,
  FieldErrors,
  MyAnimal,
  Photo,
  SaveAnimal,
  SetAvailability,
  UploadPhoto,
} from '../animal-form.types';
import { DEFAULT_BREED, validateAnimal } from '../schemas/animal.schema';
import { DeleteAnimalDialog } from './delete-animal-dialog.client';
import { PHOTOS_FIELD_ID, PhotoManager } from './photo-manager.client';

const t = animalFormDictionary;
const f = t.form;

type Values = Omit<AnimalFormValues, 'imageIds'>;
type TextField = 'name' | 'breed' | 'ageValue' | 'description';

/** DOM order: the summary lists the errors as the NGO meets the fields. */
const FIELD_ORDER: readonly AnimalField[] = [
  'photos',
  'name',
  'species',
  'breed',
  'sex',
  'size',
  'ageValue',
  'ageUnit',
  'description',
];
const IDS: Record<AnimalField, string> = {
  photos: PHOTOS_FIELD_ID,
  name: 'animal-name',
  species: 'animal-species-DOG',
  breed: 'animal-breed',
  sex: 'animal-sex-MALE',
  size: 'animal-size-SMALL',
  ageValue: 'animal-age',
  ageUnit: 'animal-age-unit',
  description: 'animal-description',
};
const errorId = (field: AnimalField) => `animal-${field}-error`;
const COUNTER_ID = 'animal-description-counter';

const FIELD_CLASS =
  'min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30';

export interface AnimalFormProps {
  /** The animal being edited; null to create one. */
  animal: MyAnimal | null;
  /** AFORM-07: 8, or DEMO_MAX_IMAGES_PER_ANIMAL with the demo on. */
  maxPhotos: number;
  /** MAX_UPLOAD_MB (AFORM-08). */
  maxUploadMb: number;
  uploadPhoto: UploadPhoto;
  saveAnimal: SaveAnimal;
  deleteAnimal: DeleteAnimal;
  /** `toggleAvailability` of the dashboard, for the delete dialog (AFORM-15). */
  markUnavailable: SetAvailability;
  /** The DEMO-06 expiry notice, rendered by the app. */
  notice?: React.ReactNode;
}

/**
 * AFORM-01 to AFORM-16. <Activity> keeps the page mounted after the redirect to
 * /painel, so a submitted form starts fresh the next time it shows.
 */
export function AnimalForm(props: AnimalFormProps) {
  const [generation, setGeneration] = useState(0);
  const submitted = useRef(false);

  useLayoutEffect(
    () => () => {
      if (!submitted.current) return;
      submitted.current = false;
      setGeneration((n) => n + 1);
    },
    [],
  );

  return (
    <AnimalFormBody
      key={generation}
      {...props}
      onSubmitting={(value) => (submitted.current = value)}
    />
  );
}

function initialValues(animal: MyAnimal | null): Values {
  if (!animal) {
    return {
      name: '',
      species: '',
      sex: '',
      size: '',
      ageValue: '',
      ageUnit: 'YEARS',
      breed: DEFAULT_BREED,
      description: '',
    };
  }
  return {
    name: animal.name,
    species: animal.species,
    sex: animal.sex,
    size: animal.size,
    ageValue: String(animal.ageValue),
    ageUnit: animal.ageUnit,
    breed: animal.breed ?? '',
    description: animal.description ?? '',
  };
}

const initialPhotos = (animal: MyAnimal | null): Photo[] =>
  (animal?.images ?? []).map((image) => ({
    key: image.id,
    status: 'done',
    id: image.id,
    previewUrl: image.thumbUrl,
    alt: image.alt,
  }));

function AnimalFormBody({
  animal,
  maxPhotos,
  maxUploadMb,
  uploadPhoto,
  saveAnimal,
  deleteAnimal,
  markUnavailable,
  notice,
  onSubmitting,
}: AnimalFormProps & { onSubmitting: (value: boolean) => void }) {
  const [values, setValues] = useState(() => initialValues(animal));
  const [photos, setPhotos] = useState(() => initialPhotos(animal));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const generalRef = useRef<HTMLParagraphElement>(null);

  // A11Y-05: after a failed submit, focus the first field with an error.
  useEffect(() => {
    if (attempt === 0) return;
    if (Object.keys(errors).length > 0) focusFirstError(formRef.current!);
    else generalRef.current?.focus();
  }, [attempt]);

  function change<K extends keyof Values>(field: K, value: Values[K]) {
    setErrors(({ [field]: _removed, ...rest }) => rest);
    setValues((current) => ({ ...current, [field]: value }));
  }

  function changePhotos(update: React.SetStateAction<Photo[]>) {
    setErrors(({ photos: _removed, ...rest }) => rest);
    setPhotos(update);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const imageIds = photos.flatMap((photo) =>
      photo.status === 'done' && photo.id ? [photo.id] : [],
    );
    const data: AnimalFormValues = { ...values, imageIds };
    const result = validateAnimal(data);
    const next: FieldErrors = result.ok ? {} : { ...result.errors };
    if (photos.some((photo) => photo.status === 'uploading')) {
      next.photos = f.waitUploads;
    } else if (photos.some((photo) => photo.status === 'error')) {
      next.photos = f.failedPhotos;
    }

    setGeneralError(undefined);
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setAttempt((n) => n + 1);
      return;
    }

    setErrors({});
    onSubmitting(true);
    startTransition(async () => {
      // Success redirects; a dropped request rejects.
      const failure = await saveAnimal(animal?.id ?? null, data).catch(() => ({
        ok: false as const,
        error: t.save.failed,
        fieldErrors: {},
      }));
      onSubmitting(false);
      setErrors(failure.fieldErrors);
      setGeneralError(failure.error);
      setAttempt((n) => n + 1);
    });
  }

  const summary: ErrorSummaryItem[] = FIELD_ORDER.flatMap((field) => {
    const message = errors[field];
    return message ? [{ fieldId: IDS[field], message }] : [];
  });

  const invalid = (field: AnimalField) => (errors[field] ? true : undefined);
  const describedBy = (field: AnimalField, ...extra: string[]) =>
    [errors[field] && errorId(field), ...extra].filter(Boolean).join(' ') ||
    undefined;
  const fieldError = (field: AnimalField) =>
    errors[field] && (
      <FieldError id={errorId(field)}>{errors[field]}</FieldError>
    );

  const textInput = (field: TextField, label: string, extra = {}) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={IDS[field]}>{label}</Label>
      <Input
        id={IDS[field]}
        name={field}
        value={values[field]}
        onChange={(event) => change(field, event.target.value)}
        aria-invalid={invalid(field)}
        aria-describedby={describedBy(field)}
        {...extra}
      />
      {fieldError(field)}
    </div>
  );

  function choice<K extends 'species' | 'sex' | 'size'>(
    field: K,
    legend: string,
    options: Record<string, string>,
  ) {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{legend}</legend>
        <div
          className={cn(
            'grid gap-2',
            Object.keys(options).length === 3 ? 'grid-cols-3' : 'grid-cols-2',
          )}
        >
          {Object.entries(options).map(([option, text]) => (
            <label
              key={option}
              className="touch-target flex cursor-pointer items-center justify-center rounded-2xl border border-border bg-surface px-2 font-semibold text-fg has-checked:border-brand-deep has-checked:bg-brand-deep has-checked:text-on-brand-deep has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus has-aria-invalid:border-error"
            >
              <input
                type="radio"
                id={`animal-${field}-${option}`}
                name={field}
                value={option}
                checked={values[field] === option}
                onChange={() => change(field, option as Values[K])}
                aria-invalid={invalid(field)}
                aria-describedby={describedBy(field)}
                className="sr-only"
              />
              {text}
            </label>
          ))}
        </div>
        {fieldError(field)}
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {notice}
      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
      >
        <ErrorSummary title={f.errorSummaryTitle} errors={summary} />
        {generalError && (
          <p
            ref={generalRef}
            role="alert"
            tabIndex={-1}
            className="rounded-2xl border border-error bg-error-soft p-4 font-semibold text-error-fg"
          >
            {generalError}
          </p>
        )}

        <PhotoManager
          photos={photos}
          onChange={changePhotos}
          max={maxPhotos}
          maxUploadMb={maxUploadMb}
          upload={uploadPhoto}
          error={errors.photos}
        />

        {textInput('name', f.name, {
          autoComplete: 'off',
          placeholder: f.namePlaceholder,
        })}
        {choice('species', f.species, f.speciesOptions)}
        {textInput('breed', f.breed, { autoComplete: 'off' })}
        {choice('sex', f.sex, f.sexOptions)}
        {choice('size', f.size, f.sizeOptions)}

        <div className="grid grid-cols-2 gap-3">
          {textInput('ageValue', f.ageValue, { inputMode: 'numeric' })}
          <div className="flex flex-col gap-2">
            <Label htmlFor={IDS.ageUnit}>{f.ageUnit}</Label>
            <select
              id={IDS.ageUnit}
              name="ageUnit"
              value={values.ageUnit}
              onChange={(event) =>
                change('ageUnit', event.target.value as Values['ageUnit'])
              }
              aria-invalid={invalid('ageUnit')}
              aria-describedby={describedBy('ageUnit')}
              className={FIELD_CLASS}
            >
              {Object.entries(f.ageUnitOptions).map(([unit, text]) => (
                <option key={unit} value={unit}>
                  {text}
                </option>
              ))}
            </select>
            {fieldError('ageUnit')}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={IDS.description}>{f.description}</Label>
          <textarea
            id={IDS.description}
            name="description"
            rows={5}
            value={values.description}
            placeholder={f.descriptionPlaceholder}
            onChange={(event) => change('description', event.target.value)}
            aria-invalid={invalid('description')}
            aria-describedby={describedBy('description', COUNTER_ID)}
            className={cn(FIELD_CLASS, 'min-h-32 py-2')}
          />
          <p id={COUNTER_ID} className="text-sm text-fg-secondary">
            {f.counter(values.description.length)}
          </p>
          {fieldError('description')}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="rounded-full bg-brand text-base font-semibold text-on-brand hover:bg-brand/90"
        >
          {pending ? f.saving : animal ? f.update : f.create}
        </Button>
      </form>

      {animal && (
        <DeleteAnimalDialog
          animalId={animal.id}
          name={animal.name}
          onDelete={deleteAnimal}
          onMarkUnavailable={markUnavailable}
        />
      )}
    </div>
  );
}
