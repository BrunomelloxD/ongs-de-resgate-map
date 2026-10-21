'use client';

import { Chip, ChipGroup } from '@/components/ui/chip';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ANIMAL_FILTERS,
  SEXES,
  SIZES,
  SPECIES,
} from '../animal-filters';
import { ngoPageDictionary } from '../ngo-page.dictionary';
import type { NgoAnimalFilters } from '../ngo-page.types';

const t = ngoPageDictionary.animals;

export interface AnimalFiltersProps {
  value: NgoAnimalFilters;
  onChange: (next: NgoAnimalFilters) => void;
  className?: string;
}

/** Species, sex and size combine (NGO-06); "Só disponíveis" starts on (NGO-05). */
export function AnimalFilters({
  value,
  onChange,
  className,
}: AnimalFiltersProps) {
  function group<K extends 'species' | 'sex' | 'size'>(
    key: K,
    label: string,
    options: readonly NonNullable<NgoAnimalFilters[K]>[],
    names: Record<NonNullable<NgoAnimalFilters[K]>, string>,
  ) {
    return (
      <ChipGroup label={label}>
        {options.map((option) => (
          <Chip
            key={option}
            pressed={value[key] === option}
            // One value per filter: pressing the chosen one clears it.
            onPressedChange={(on) =>
              onChange({ ...value, [key]: on ? option : undefined })
            }
          >
            {names[option]}
          </Chip>
        ))}
      </ChipGroup>
    );
  }

  return (
    <section
      aria-label={t.filters}
      className={cn('flex flex-col gap-4', className)}
    >
      {group('species', t.species, SPECIES, t.speciesOptions)}
      {group('sex', t.sex, SEXES, t.sexOptions)}
      {group('size', t.size, SIZES, t.sizeOptions)}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Switch
            aria-label={t.onlyAvailable}
            checked={value.available}
            onCheckedChange={(available) => onChange({ ...value, available })}
          />
          <span aria-hidden="true">{t.onlyAvailable}</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_ANIMAL_FILTERS)}
          className="touch-target inline-flex items-center font-semibold text-brand-text underline underline-offset-4"
        >
          {t.clear}
        </button>
      </div>
    </section>
  );
}
