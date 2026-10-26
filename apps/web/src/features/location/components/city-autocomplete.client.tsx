'use client';

import { MapPin, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/error-summary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskCep } from '@/lib/masks';
import { cn } from '@/lib/utils';
import { fetchCities } from '../fetch-cities';
import { locationDictionary } from '../location.dictionary';
import type { CepAddress, City, LookupCepResult } from '../location.types';

const t = locationDictionary.city;
const tCep = locationDictionary.cep;

export const CITY_DEBOUNCE_MS = 250;
const MIN_QUERY = 3;
const MAX_SUGGESTIONS = 5;
const CEP_DIGITS = 8;

type Result =
  | { status: 'idle' }
  | { status: 'ready'; cities: City[] }
  | { status: 'error' };

/** A CEP with a point on the map (LOC-09). */
export type FoundCep = CepAddress & { cep: string; lat: number; lng: number };

type CepState =
  | { status: 'idle' }
  | { status: 'pending'; cep: string }
  | { status: 'found'; cep: string; address: FoundCep }
  | { status: 'error'; cep: string; message: string };

export interface CityAutocompleteProps {
  /** Called with the municipality the visitor picked (LOC-08). */
  onSelect: (city: City) => void;
  /** Defaults to the `/geo/cities` BFF; stories and tests pass a fake. */
  search?: (q: string, signal: AbortSignal) => Promise<City[]>;
  /** The `lookupCep` Server Action: with it, the field takes a CEP too (LOC-09 to LOC-11). */
  lookupCep?: (cep: string) => Promise<LookupCepResult>;
  /** Called with the CEP the visitor picked or submitted. */
  onCep?: (address: FoundCep) => void;
  /** The button under the field, e.g. "Ver ONGs nesta região". */
  submitLabel?: string;
  submitVariant?: 'default' | 'outline';
  /** Next to the button on desktop (below it on the phone). */
  extra?: React.ReactNode;
  /** Replaces "Cidade" / "Cidade ou CEP", e.g. the map's "Buscar outra região". */
  label?: string;
  /**
   * `bar`: the map's floating search pill (figcraft "Search/Map"): hidden
   * label, white pill with a shadow, the suggestions over the map.
   */
  variant?: 'field' | 'bar';
  /** Inside the bar, after the text, e.g. the filters button. */
  trailing?: React.ReactNode;
}

const onlyDigits = (text: string) => text.replace(/\D/g, '');
const looksLikeCep = (text: string) => /^[\d.\-\s]+$/.test(text.trim());

/**
 * Figcraft "Cidade ou CEP" (02-permissao-negada, 03-mapa-erro): one ARIA
 * combobox with a magnifier. Letters search the IBGE municipalities (LOC-07:
 * 3+ characters, 250 ms debounce, up to 5 options); a full CEP is looked up
 * and offered as an option (LOC-09), with the messages of LOC-10 and LOC-11.
 */
export function CityAutocomplete({
  onSelect,
  search = fetchCities,
  lookupCep,
  onCep,
  submitLabel,
  submitVariant = 'default',
  extra,
  label,
  variant = 'field',
  trailing,
}: CityAutocompleteProps) {
  const bar = variant === 'bar';
  const name = label ?? (lookupCep ? t.labelWithCep : t.label);
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const [value, setValue] = useState('');
  // What gets searched; picking an option changes `value` only.
  const [term, setTerm] = useState('');
  const [result, setResult] = useState<Result>({ status: 'idle' });
  const [cep, setCep] = useState<CepState>({ status: 'idle' });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [formError, setFormError] = useState<string | null>(null);
  // The CEP the last lookup was for: a stale answer is dropped.
  const lookedUp = useRef('');

  const cepMode = lookupCep !== undefined && looksLikeCep(term);

  useEffect(() => {
    const q = term.trim();
    if (cepMode || q.length < MIN_QUERY) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let next: Result;
      try {
        const cities = await search(q, controller.signal);
        next = { status: 'ready', cities: cities.slice(0, MAX_SUGGESTIONS) };
      } catch {
        next = { status: 'error' };
      }
      // A newer text replaced this one while it was in flight.
      if (controller.signal.aborted) return;
      setResult(next);
      setActive(-1);
      setOpen(true);
    }, CITY_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, search, cepMode]);

  async function findCep(masked: string) {
    lookedUp.current = masked;
    setCep({ status: 'pending', cep: masked });
    const answer = await lookupCep!(masked);
    if (lookedUp.current !== masked) return;
    if (!answer.ok) {
      setCep({ status: 'error', cep: masked, message: answer.error });
      return;
    }
    const { lat, lng } = answer.address;
    // SPEC_DEVIATION: a CEP without coordinates isn't covered by LOC-09/10/11.
    // Reason: the map needs a center; the LOC-11 text sends the visitor to the city search.
    if (lat === null || lng === null) {
      setCep({ status: 'error', cep: masked, message: tCep.unavailable });
      return;
    }
    const address = { ...answer.address, cep: masked, lat, lng };
    setCep({ status: 'found', cep: masked, address });
    setOpen(true);
    setActive(-1);
  }

  const cities = !cepMode && result.status === 'ready' ? result.cities : [];
  const found = cepMode && cep.status === 'found' ? cep.address : null;
  const optionCount = found ? 1 : cities.length;
  const expanded = open && optionCount > 0;
  const error =
    formError ?? (cepMode && cep.status === 'error' ? cep.message : null);

  function change(text: string) {
    const next =
      lookupCep && looksLikeCep(text) && onlyDigits(text).length > 0
        ? maskCep(text)
        : text;
    setValue(next);
    setTerm(next);
    setActive(-1);
    setFormError(null);
    lookedUp.current = '';
    setCep({ status: 'idle' });
    if (lookupCep && looksLikeCep(next)) {
      setResult({ status: 'idle' });
      setOpen(false);
      if (onlyDigits(next).length === CEP_DIGITS) void findCep(next);
      return;
    }
    if (next.trim().length < MIN_QUERY) {
      setResult({ status: 'idle' });
      setOpen(false);
    }
  }

  function pick(city: City) {
    setValue(`${city.name} – ${city.uf}`);
    setOpen(false);
    setActive(-1);
    onSelect(city);
  }

  function pickCep(address: FoundCep) {
    setOpen(false);
    setActive(-1);
    onCep?.(address);
  }

  function choose(index: number) {
    if (found) pickCep(found);
    else pick(cities[index]!);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (cepMode) {
      if (onlyDigits(text).length !== CEP_DIGITS) {
        setFormError(tCep.invalid);
        return;
      }
      // The 8th digit already started the lookup: while pending or failed, stay.
      if (found) pickCep(found);
      return;
    }
    if (expanded && active >= 0) {
      choose(active);
      return;
    }
    // SPEC_DEVIATION: the spec doesn't word these two; simplest texts.
    setFormError(text === '' ? t.required : t.pick);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!expanded) return;

    const last = optionCount - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(active >= last ? 0 : active + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(active <= 0 ? last : active - 1);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(active);
    }
  }

  const pending = cepMode && cep.status === 'pending';

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <div className="relative flex flex-col gap-2">
        <Label htmlFor={id} className={cn(bar && 'sr-only')}>
          {name}
        </Label>
        <div
          className={cn(
            'relative',
            bar && 'flex items-center rounded-full bg-surface pr-2 shadow-card',
          )}
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-fg-secondary"
          />
          <Input
            id={id}
            type="text"
            role="combobox"
            autoComplete="off"
            inputMode={cepMode ? 'numeric' : undefined}
            placeholder={lookupCep ? t.placeholder : undefined}
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={
              expanded && active >= 0 ? `${listId}-${active}` : undefined
            }
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            value={value}
            onChange={(event) => change(event.target.value)}
            onKeyDown={onKeyDown}
            className={cn(
              'pl-13',
              bar &&
                'min-w-0 flex-1 rounded-full border-0 bg-transparent focus-visible:border-0',
            )}
          />
          {trailing}
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label={name}
          hidden={!expanded}
          className={cn(
            'flex flex-col gap-1 rounded-2xl bg-surface p-1.5 shadow-card',
            bar && 'absolute inset-x-0 top-full z-10 mt-2',
          )}
        >
          {found ? (
            <Option
              id={`${listId}-0`}
              active={active === 0}
              title={found.cep}
              detail={cepDetail(found)}
              onPick={() => pickCep(found)}
            />
          ) : (
            cities.map((city, index) => (
              <Option
                key={city.id}
                id={`${listId}-${index}`}
                active={index === active}
                title={city.name}
                detail={`${t.cityPrefix}${city.uf}`}
                onPick={() => pick(city)}
              />
            ))
          )}
        </ul>
        {/* Over the map, the messages need a card under them. */}
        <div
          className={cn(
            bar && 'rounded-2xl bg-surface px-4 py-3 shadow-card empty:hidden',
          )}
        >
          {open &&
            !cepMode &&
            result.status === 'ready' &&
            cities.length === 0 && (
              <p className="text-sm text-fg-secondary">{t.empty}</p>
            )}
          {!cepMode && result.status === 'error' && (
            <p className="text-sm font-semibold text-error-fg">{t.error}</p>
          )}
          {error && <FieldError id={errorId}>{error}</FieldError>}
        </div>
      </div>
      {submitLabel && (
        <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center">
          <Button
            type="submit"
            variant={submitVariant}
            disabled={pending}
            className="w-full lg:w-auto"
          >
            {pending ? tCep.pending : submitLabel}
          </Button>
          {extra}
        </div>
      )}
    </form>
  );
}

const cepDetail = (address: FoundCep) =>
  [address.district, `${address.city} – ${address.uf}`]
    .filter(Boolean)
    .join(', ');

function Option({
  id,
  active,
  title,
  detail,
  onPick,
}: {
  id: string;
  active: boolean;
  title: string;
  /** The grey line under the title. */
  detail: string;
  onPick: () => void;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPick}
      className={cn(
        'touch-target flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 hover:bg-subtle',
        active && 'bg-subtle',
      )}
    >
      <MapPin
        aria-hidden="true"
        className="size-6 shrink-0 text-fg-secondary"
      />
      <span className="flex flex-col">
        <span className="font-bold">{title}</span>
        {/* Named by both lines: "São Paulo Cidade · SP". */}{' '}
        <span className="text-sm text-fg-secondary">{detail}</span>
      </span>
    </li>
  );
}
