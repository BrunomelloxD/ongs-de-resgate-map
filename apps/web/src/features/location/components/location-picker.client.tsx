'use client';

import { EyeOff, LocateFixed, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  /** The `lookupCep` Server Action, for the "Cidade ou CEP" field. */
  lookupCep: (cep: string) => Promise<LookupCepResult>;
  /** Goes to the map; the page passes `router.push`. */
  navigate: (href: string) => void;
  /** Passed to `CityAutocomplete`; stories and tests use a fake. */
  searchCities?: CityAutocompleteProps['search'];
  /** Initial state, for stories. */
  initialPhase?: Phase;
}

/** The round map with the "você" dot above the title on the phone (figcraft 02, L-01). */
export const LOCATION_ART = '/photos/location-map-round.webp';

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
      <section className="flex flex-col gap-4 lg:gap-5">
        <img
          src={LOCATION_ART}
          alt=""
          width={480}
          height={480}
          className="mx-auto my-2 size-60 lg:hidden"
        />
        <h1 className="font-heading text-[2.5rem] leading-[2.875rem] font-extrabold tracking-tight lg:text-5xl lg:leading-[3.375rem]">
          {t.ask.title}
        </h1>
        <p className="text-lg leading-7">{t.ask.lead}</p>
        <ul className="flex flex-col gap-3.5">
          {t.ask.reasons.map((reason, index) => {
            const Icon = [LocateFixed, EyeOff, Search][index]!;
            return (
              <li key={reason} className="flex items-center gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {reason}
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row">
          <Button disabled={asking} onClick={locate}>
            <LocateFixed aria-hidden="true" />
            {asking ? t.ask.asking : t.ask.useLocation}
          </Button>
          <Button variant="outline" onClick={() => setPhase('manual')}>
            {t.ask.manual}
          </Button>
        </div>
        <p className="text-center text-sm text-fg-secondary lg:text-left">
          {t.ask.promptHint}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      {phase !== 'manual' && (
        <Alert
          role="alert"
          variant="info"
          title={t[phase].title}
          className="lg:max-w-[480px]"
        >
          {phase === 'denied' ? (
            <>
              <span className="lg:hidden">{t.denied.text}</span>
              <span className="hidden lg:inline">{t.denied.textDesktop}</span>
            </>
          ) : (
            t.unavailable.text
          )}
        </Alert>
      )}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-heading text-[2.5rem] leading-[2.875rem] font-extrabold tracking-tight outline-none lg:text-5xl lg:leading-[3.375rem]"
      >
        {t.manual.title}
      </h1>
      <p className="text-lg leading-7 text-fg-secondary">{t.manual.lead}</p>
      <CityAutocomplete
        search={searchCities}
        lookupCep={lookupCep}
        onSelect={(city) => navigate(mapHref(city))}
        onCep={(address) => navigate(mapHref(address))}
        submitLabel={t.manual.submit}
        extra={
          <button
            type="button"
            onClick={locate}
            className="touch-target inline-flex items-center px-1 font-bold text-brand-text underline underline-offset-4"
          >
            {phase === 'manual' ? t.ask.useLocation : t.retry}
          </button>
        }
      />
    </section>
  );
}
