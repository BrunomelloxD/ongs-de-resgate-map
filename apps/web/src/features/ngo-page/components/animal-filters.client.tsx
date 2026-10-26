'use client';

import { Chip } from '@/components/ui/chip';
import { ChipSelect } from '@/components/ui/chip-select';
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

const isDefault = ({ species, sex, size, available }: NgoAnimalFilters) =>
  !species && !sex && !size && available;

/**
 * Figcraft 04 (O-06, C-15): "Espécie ▾", "Sexo ▾", "Porte ▾" and "✓ Só
 * disponíveis" in one row. The three combine (NGO-06); "Só disponíveis" starts
 * on (NGO-05). "Limpar filtros" only shows with a filter changed.
 */
export function AnimalFilters({
  value,
  onChange,
  className,
}: AnimalFiltersProps) {
  function dropdown<K extends 'species' | 'sex' | 'size'>(
    key: K,
    label: string,
    all: string,
    options: readonly NonNullable<NgoAnimalFilters[K]>[],
    names: Record<NonNullable<NgoAnimalFilters[K]>, string>,
  ) {
    const chosen = value[key];
    return (
      <ChipSelect
        label={label}
        value={chosen ?? ''}
        display={chosen ? names[chosen] : label}
        active={chosen !== undefined}
        options={[
          { value: '', label: all },
          ...options.map((option) => ({ value: option, label: names[option] })),
        ]}
        // One value per filter; "all" clears it.
        onValueChange={(next) =>
          onChange({
            ...value,
            [key]: next === '' ? undefined : (next as NgoAnimalFilters[K]),
          })
        }
      />
    );
  }

  return (
    <section
      aria-label={t.filters}
      className={cn('flex flex-col items-start gap-2', className)}
    >
      <div
        data-slot="animal-filters-row"
        className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:w-full lg:flex-wrap lg:overflow-visible lg:px-0"
      >
        {dropdown(
          'species',
          t.species,
          t.allSpecies,
          SPECIES,
          t.speciesOptions,
        )}
        {dropdown('sex', t.sex, t.allSexes, SEXES, t.sexOptions)}
        {dropdown('size', t.size, t.allSizes, SIZES, t.sizeOptions)}
        <Chip
          pressed={value.available}
          onPressedChange={(available) => onChange({ ...value, available })}
          className="shrink-0"
        >
          {t.onlyAvailable}
        </Chip>
      </div>
      {!isDefault(value) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_ANIMAL_FILTERS)}
          className="touch-target inline-flex items-center font-semibold text-brand-text underline underline-offset-4"
        >
          {t.clear}
        </button>
      )}
    </section>
  );
}
