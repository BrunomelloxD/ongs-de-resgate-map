'use client';

import { Search } from 'lucide-react';
import { useId, useState } from 'react';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { dashboardDictionary } from '../dashboard.dictionary';
import type { MyAnimal, ToggleAvailability } from '../dashboard.types';
import { AnimalRow } from './animal-row.client';

const t = dashboardDictionary.list;

const FILTERS = {
  all: () => true,
  dogs: (animal: MyAnimal) => animal.species === 'DOG',
  cats: (animal: MyAnimal) => animal.species === 'CAT',
  available: (animal: MyAnimal) => animal.available,
  unavailable: (animal: MyAnimal) => !animal.available,
} as const;

type Filter = keyof typeof FILTERS;

/** Lowercase, without accents: "João" → "joao" (DASH-04). */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export interface AnimalListProps {
  animals: readonly MyAnimal[];
  /** Server Action `toggleAvailability`, passed to each row. */
  onToggle: ToggleAvailability;
  className?: string;
}

/** Search and filter run on the loaded list (DASH-04, DASH-05; at most 10 animals in the demo). */
export function AnimalList({ animals, onToggle, className }: AnimalListProps) {
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const query = fold(search.trim());
  const shown = animals.filter(
    (animal) => FILTERS[filter](animal) && fold(animal.name).includes(query),
  );

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor={searchId} className="text-sm font-bold text-fg">
          {t.search}
        </Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-fg-muted"
          />
          <Input
            id={searchId}
            type="search"
            value={search}
            placeholder={t.searchPlaceholder}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <ChipGroup label={t.filter}>
        {(Object.keys(FILTERS) as Filter[]).map((key) => (
          <Chip
            key={key}
            pressed={filter === key}
            // One filter at a time; pressing the chosen one goes back to "Todos".
            onPressedChange={(on) => setFilter(on ? key : 'all')}
          >
            {t.filters[key]}
          </Chip>
        ))}
      </ChipGroup>
      {shown.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {shown.map((animal) => (
            <AnimalRow key={animal.id} animal={animal} onToggle={onToggle} />
          ))}
        </ul>
      ) : (
        <p className="rounded-3xl bg-subtle px-4 py-6 text-center text-fg-secondary">
          {t.empty}
        </p>
      )}
    </div>
  );
}
