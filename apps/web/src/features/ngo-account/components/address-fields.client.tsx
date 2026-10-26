'use client';

import { useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { FieldError } from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { LatLngTuple } from '@/components/ui/map-view.client';
import type { PinPickerProps } from '@/components/ui/pin-picker.client';
import { maskCep, normalizeCep } from '@/lib/masks';
import { UFS } from '@/lib/ufs';
import { cn } from '@/lib/utils';
import { ngoAccountDictionary } from '../ngo-account.dictionary';
import type {
  AddressField,
  AddressFieldsValues,
  CepLookupResult,
  GeocodeAddressInput,
  GeocodeAddressResult,
} from '../ngo-account.types';

const t = ngoAccountDictionary.address;

/** Changing any of these moves the NGO, so the pin needs a new confirmation (PROF-03). */
const PLACE_FIELDS = ['cep', 'street', 'number', 'district', 'city', 'uf'];
/** Filled by the CEP; read-only until the CEP lookup answers (SIGN-17, SIGN-18). */
const CEP_FIELDS = ['street', 'district', 'city', 'uf'] as const;

interface Pin {
  position: LatLngTuple;
  notFound: boolean;
  /** New key → new PinPicker, which reads the position only once. */
  key: string;
}

/** The geocoding input, or null while some part is missing (SIGN-19). */
function completeAddress(v: AddressFieldsValues): GeocodeAddressInput | null {
  const input = {
    street: v.street.trim(),
    number: v.number.trim(),
    district: v.district.trim(),
    city: v.city.trim(),
    uf: v.uf,
  };
  const filled = Object.values(input).every(Boolean);
  return filled && normalizeCep(v.cep).length === 8 ? input : null;
}

export interface AddressFieldsProps {
  /** Values as typed, with the CEP masked. */
  values: AddressFieldsValues;
  onChange: (values: Partial<AddressFieldsValues>) => void;
  /** Field errors from the step or the form that owns the fields. */
  errors?: Partial<Record<AddressField, string>>;
  /** Field ids are `{idPrefix}-{field}`, so an error summary can link to them. */
  idPrefix: string;
  /** The `lookupCep` Server Action. */
  lookupCep: (cep: string) => Promise<CepLookupResult>;
  /** The `geocodeAddress` Server Action. */
  geocodeAddress: (
    address: GeocodeAddressInput,
  ) => Promise<GeocodeAddressResult>;
  /** `PinPicker`, loaded with `next/dynamic({ ssr: false })` in the app (PERF-01). */
  PinPicker: ComponentType<PinPickerProps>;
  tileUrl: string;
  attribution: string;
}

/**
 * Address of the NGO (SIGN-17 to SIGN-22), shared by the signup and the profile:
 * the CEP fills the rest, a complete address shows the pin to confirm.
 */
export function AddressFields({
  values,
  onChange,
  errors = {},
  idPrefix,
  lookupCep,
  geocodeAddress,
  PinPicker,
  tileUrl,
  attribution,
}: AddressFieldsProps) {
  const id = (field: AddressField) => `${idPrefix}-${field}`;
  const [cepDone, setCepDone] = useState(
    () => normalizeCep(values.cep).length === 8,
  );
  const [cepFailed, setCepFailed] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [pin, setPin] = useState<Pin | null>(() =>
    values.location
      ? {
          position: [values.location.lat, values.location.lng],
          notFound: false,
          key: 'saved',
        }
      : null,
  );
  // The CEP's point backs the map when the geocoder finds nothing at all.
  const cepPoint = useRef<LatLngTuple | null>(null);
  // A saved confirmation already belongs to this address: no new geocoding on blur.
  const geocodedKey = useRef<string | null>(
    values.location ? JSON.stringify(completeAddress(values)) : null,
  );
  // Next keeps a visited page in a hidden <Activity>. Leaflet can't survive its effects
  // re-running on the same map, so the picker unmounts when hidden and mounts again.
  const [visible, setVisible] = useState(false);
  useLayoutEffect(() => {
    setVisible(true);
    return () => setVisible(false);
  }, []);

  // The CEP answer arrives later: other fields may have been typed meanwhile.
  const latest = useRef(values);
  latest.current = values;

  async function geocode(next: AddressFieldsValues) {
    const input = completeAddress(next);
    if (!input) return;
    const key = JSON.stringify(input);
    if (geocodedKey.current === key) return;
    geocodedKey.current = key;

    setGeocoding(true);
    setGeocodeFailed(false);
    const result = await geocodeAddress(input).catch(() => null);
    setGeocoding(false);
    if (geocodedKey.current !== key) return;

    const point: LatLngTuple | null =
      result?.lat != null && result.lng != null
        ? [result.lat, result.lng]
        : cepPoint.current;
    if (!point) {
      setGeocodeFailed(true);
      return;
    }
    setPin({ position: point, notFound: !result?.found, key });
  }

  /** Any change to the place drops the pin and its confirmation (PROF-03). */
  function change(patch: Partial<AddressFieldsValues>) {
    const moves = Object.keys(patch).some((f) => PLACE_FIELDS.includes(f));
    if (moves) {
      setPin(null);
      setGeocodeFailed(false);
      geocodedKey.current = null;
      onChange(values.location ? { ...patch, location: null } : patch);
    } else {
      onChange(patch);
    }
  }

  async function onCepChange(raw: string) {
    const cep = maskCep(raw);
    if (cep === values.cep) return;
    change({ cep });
    const digits = normalizeCep(cep);
    if (digits.length !== 8) return;

    setCepLoading(true);
    const result = await lookupCep(digits).catch(() => null);
    setCepLoading(false);
    // The NGO may have typed another CEP meanwhile.
    if (latest.current.cep !== cep) return;
    setCepDone(true);

    if (!result?.ok) {
      cepPoint.current = null;
      setCepFailed(true);
      return;
    }
    setCepFailed(false);
    const { street, district, city, uf, lat, lng } = result.address;
    cepPoint.current = lat != null && lng != null ? [lat, lng] : null;
    const filled = { street, district, city, uf };
    change(filled);
    void geocode({ ...latest.current, ...filled });
  }

  function onConfirmedChange(position: LatLngTuple | null) {
    onChange({
      location: position
        ? {
            lat: position[0],
            lng: position[1],
            confirmedAt: new Date().toISOString(),
          }
        : null,
    });
  }

  const describedBy = (field: AddressField, ...extra: (string | false)[]) =>
    [errors[field] && `${id(field)}-error`, ...extra]
      .filter(Boolean)
      .join(' ') || undefined;

  const fieldError = (field: AddressField) =>
    errors[field] && (
      <FieldError id={`${id(field)}-error`}>{errors[field]}</FieldError>
    );

  const textField = (
    field: 'street' | 'number' | 'complement' | 'district' | 'city',
    options: { autoComplete: string; placeholder?: string },
  ) => {
    const locked =
      !cepDone && (CEP_FIELDS as readonly string[]).includes(field);
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={id(field)}>{t[field]}</Label>
        <Input
          id={id(field)}
          name={field}
          value={values[field]}
          readOnly={locked}
          autoComplete={options.autoComplete}
          placeholder={options.placeholder}
          onChange={(e) => change({ [field]: e.target.value })}
          onBlur={() => void geocode(values)}
          aria-invalid={errors[field] ? true : undefined}
          aria-describedby={describedBy(field)}
          className={cn(locked && 'bg-surface-2')}
        />
        {fieldError(field)}
      </div>
    );
  };

  const cepHintId = `${id('cep')}-hint`;
  const cepNoticeId = `${id('cep')}-notice`;
  const ufLocked = !cepDone;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id('cep')}>{t.cep}</Label>
        <Input
          id={id('cep')}
          name="cep"
          inputMode="numeric"
          autoComplete="postal-code"
          value={values.cep}
          onChange={(e) => void onCepChange(e.target.value)}
          aria-invalid={errors.cep ? true : undefined}
          aria-describedby={describedBy(
            'cep',
            cepHintId,
            cepFailed && cepNoticeId,
          )}
        />
        <p id={cepHintId} className="text-sm text-fg-secondary">
          {t.cepHint}
        </p>
        {fieldError('cep')}
        <div role="status" className="text-sm">
          {cepLoading && (
            <span className="text-fg-secondary">{t.cepLoading}</span>
          )}
          {cepFailed && (
            <span
              id={cepNoticeId}
              className="block rounded-card bg-gem-soft p-4 text-gem-soft-fg"
            >
              {t.cepFailed}
            </span>
          )}
        </div>
      </div>

      {textField('street', { autoComplete: 'address-line1' })}

      <div className="grid grid-cols-2 gap-3">
        {textField('number', { autoComplete: 'off' })}
        {textField('complement', {
          autoComplete: 'address-line2',
          placeholder: t.complementPlaceholder,
        })}
      </div>

      {textField('district', { autoComplete: 'address-level3' })}

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        {textField('city', { autoComplete: 'address-level2' })}
        <div className="flex flex-col gap-2">
          <Label htmlFor={id('uf')}>{t.uf}</Label>
          <Select
            id={id('uf')}
            name="uf"
            value={values.uf}
            // A select has no read-only state.
            disabled={ufLocked}
            onChange={(e) => {
              const next = { ...values, uf: e.target.value };
              change({ uf: e.target.value });
              void geocode(next);
            }}
            aria-invalid={errors.uf ? true : undefined}
            aria-describedby={describedBy('uf')}
          >
            <option value="">{t.ufPlaceholder}</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </Select>
          {fieldError('uf')}
        </div>
      </div>

      <section
        id={id('location')}
        tabIndex={-1}
        aria-labelledby={`${id('location')}-title`}
        className="flex flex-col gap-3 outline-none"
      >
        <h2 id={`${id('location')}-title`} className="text-sm font-semibold">
          {t.mapTitle}
        </h2>
        <div role="status" className="text-sm text-fg-secondary">
          {geocoding && t.geocoding}
          {geocodeFailed && t.geocodeFailed}
        </div>
        {pin
          ? visible && (
              <PinPicker
                key={pin.key}
                tileUrl={tileUrl}
                attribution={attribution}
                position={pin.position}
                notFound={pin.notFound}
                onConfirmedChange={onConfirmedChange}
              />
            )
          : !geocoding &&
            !geocodeFailed && (
              <p className="rounded-card bg-surface-2 p-4 text-sm text-fg-secondary">
                {t.mapWaiting}
              </p>
            )}
        {fieldError('location')}
      </section>
    </div>
  );
}
