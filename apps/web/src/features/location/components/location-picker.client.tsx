'use client';

import { CircleAlert, EyeOff, Info, LocateFixed, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskCep } from '@/lib/masks';
import { locationDictionary as t } from '../location.dictionary';
import type { LookupCepResult } from '../location.types';
import { mapHref } from '../map-href';
import {
  CityAutocomplete,
  type CityAutocompleteProps,
} from './city-autocomplete.client';

export const GEOLOCATION_TIMEOUT_MS = 10_000;
// GeolocationPositionError.PERMISSION_DENIED; fakes in tests lack the constant.
const PERMISSION_DENIED = 1;

type Phase = 'idle' | 'asking' | 'denied' | 'unavailable' | 'manual';

export interface LocationPickerProps {
  /** `navigator.geolocation`; `undefined` when the browser has none (LOC-06). */
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined;
  /** The `lookupCep` Server Action. */
  lookupCep: (cep: string) => Promise<LookupCepResult>;
  /** Goes to the map; the page passes `router.push`. */
  navigate: (href: string) => void;
  /** Passed to `CityAutocomplete`; stories and tests use a fake. */
  searchCities?: CityAutocompleteProps['search'];
  /** Initial state, for stories. */
  initialPhase?: Phase;
}

const NOTICES = {
  denied: { icon: Info, ...t.denied },
  unavailable: { icon: CircleAlert, ...t.unavailable },
} as const;

/**
 * Consent first (LOC-01): `getCurrentPosition` only runs after a tap on
 * "Usar minha localização" or "Tentar de novo" (LOC-02, LOC-03).
 */
export function LocationPicker({
  geolocation,
  lookupCep,
  navigate,
  searchCities,
  initialPhase = 'idle',
}: LocationPickerProps) {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousPhase = useRef(phase);
  const isManual = phase !== 'idle' && phase !== 'asking';

  // The tapped button is gone after the switch: keep focus on the new screen.
  useEffect(() => {
    if (isManual && previousPhase.current !== phase) {
      headingRef.current!.focus();
    }
    previousPhase.current = phase;
  }, [isManual, phase]);

  function locate() {
    if (!geolocation) {
      setPhase('unavailable');
      return;
    }
    setPhase('asking');
    geolocation.getCurrentPosition(
      ({ coords }) =>
        navigate(mapHref({ lat: coords.latitude, lng: coords.longitude })),
      (error) =>
        setPhase(error.code === PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }

  if (!isManual) {
    const asking = phase === 'asking';
    return (
      <section className="flex flex-col gap-6">
        <h1 className="text-4xl font-extrabold">{t.ask.title}</h1>
        <p className="text-lg text-fg-secondary">{t.ask.lead}</p>
        <ul className="flex flex-col gap-4">
          {t.ask.reasons.map((reason, index) => {
            const Icon = [LocateFixed, EyeOff, Search][index]!;
            return (
              <li key={reason} className="flex items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {reason}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="rounded-full text-base font-semibold"
            disabled={asking}
            onClick={locate}
          >
            <LocateFixed aria-hidden="true" />
            {asking ? t.ask.asking : t.ask.useLocation}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full text-base font-semibold"
            onClick={() => setPhase('manual')}
          >
            {t.ask.manual}
          </Button>
          <p className="text-center text-sm text-fg-muted">
            {t.ask.promptHint}
          </p>
        </div>
      </section>
    );
  }

  const notice = phase === 'manual' ? null : NOTICES[phase];

  return (
    <section className="flex flex-col gap-6">
      {notice && (
        <div
          role="alert"
          className="flex gap-3 rounded-2xl bg-gem-soft p-4 text-gem-soft-fg"
        >
          <notice.icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="font-bold">{notice.title}</p>
            <p>{notice.text}</p>
          </div>
        </div>
      )}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-4xl font-extrabold outline-none"
      >
        {t.manual.title}
      </h1>
      <p className="text-lg text-fg-secondary">{t.manual.lead}</p>
      <CityAutocomplete
        search={searchCities}
        onSelect={(city) => navigate(mapHref(city))}
      />
      <CepForm lookupCep={lookupCep} navigate={navigate} />
      <Button
        size="lg"
        variant="outline"
        className="rounded-full text-base font-semibold"
        onClick={locate}
      >
        <LocateFixed aria-hidden="true" />
        {phase === 'manual' ? t.ask.useLocation : t.retry}
      </Button>
    </section>
  );
}

function CepForm({
  lookupCep,
  navigate,
}: Pick<LocationPickerProps, 'lookupCep' | 'navigate'>) {
  const id = useId();
  const errorId = `${id}-error`;
  const [cep, setCep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await lookupCep(cep);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { lat, lng } = result.address;
      // SPEC_DEVIATION: a CEP without coordinates isn't covered by LOC-09/10/11.
      // Reason: the map needs a center; the LOC-11 text sends the visitor to the city search.
      if (lat === null || lng === null) {
        setError(t.cep.unavailable);
        return;
      }
      navigate(mapHref({ lat, lng }));
    });
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-2">
      <Label htmlFor={id}>{t.cep.label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="postal-code"
          value={cep}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setCep(maskCep(event.target.value));
            setError(null);
          }}
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? t.cep.pending : t.cep.submit}
        </Button>
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </form>
  );
}
