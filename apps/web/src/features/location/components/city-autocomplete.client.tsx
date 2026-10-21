'use client';

import { MapPin } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { fetchCities } from '../fetch-cities';
import { locationDictionary } from '../location.dictionary';
import type { City } from '../location.types';

const t = locationDictionary.city;

export const CITY_DEBOUNCE_MS = 250;
const MIN_QUERY = 3;
const MAX_SUGGESTIONS = 5;

type Result =
  | { status: 'idle' }
  | { status: 'ready'; cities: City[] }
  | { status: 'error' };

export interface CityAutocompleteProps {
  /** Called with the municipality the visitor picked (LOC-08). */
  onSelect: (city: City) => void;
  /** Defaults to the `/geo/cities` BFF; stories and tests pass a fake. */
  search?: (q: string, signal: AbortSignal) => Promise<City[]>;
}

/** ARIA combobox for IBGE municipalities (LOC-07): 3+ characters, 250 ms debounce, up to 5 options. */
export function CityAutocomplete({
  onSelect,
  search = fetchCities,
}: CityAutocompleteProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [value, setValue] = useState('');
  // What gets searched; picking an option changes `value` only.
  const [term, setTerm] = useState('');
  const [result, setResult] = useState<Result>({ status: 'idle' });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const q = term.trim();
    if (q.length < MIN_QUERY) return;

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
  }, [term, search]);

  const cities = result.status === 'ready' ? result.cities : [];
  const expanded = open && cities.length > 0;

  function change(text: string) {
    setValue(text);
    setTerm(text);
    setActive(-1);
    if (text.trim().length < MIN_QUERY) {
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

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!expanded) return;

    const last = cities.length - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(active >= last ? 0 : active + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(active <= 0 ? last : active - 1);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      pick(cities[active]!);
    }
  }

  return (
    <div className="relative flex flex-col gap-2">
      <Label htmlFor={id}>{t.label}</Label>
      <Input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded && active >= 0 ? `${listId}-${active}` : undefined
        }
        value={value}
        onChange={(event) => change(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t.label}
        hidden={!expanded}
        className="flex flex-col gap-1 rounded-2xl bg-surface p-1 shadow-lg"
      >
        {cities.map((city, index) => (
          <li
            key={city.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(city)}
            className={cn(
              'touch-target flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2',
              index === active && 'bg-subtle',
            )}
          >
            <MapPin aria-hidden="true" className="size-5 shrink-0" />
            <span>
              {city.name}
              <span className="text-fg-secondary">, {city.uf}</span>
            </span>
          </li>
        ))}
      </ul>
      {open && result.status === 'ready' && cities.length === 0 && (
        <p className="text-sm text-fg-secondary">{t.empty}</p>
      )}
      {result.status === 'error' && (
        <p className="text-sm font-semibold text-error-fg">{t.error}</p>
      )}
    </div>
  );
}
