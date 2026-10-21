'use client';

import { usePathname, useRouter } from 'next/navigation';
import { animalFiltersHref } from './animal-filters';
import { AnimalFilters } from './components/animal-filters.client';
import type { NgoAnimalFilters } from './ngo-page.types';

/**
 * Turns each filter change into search params, back on page 1. Kept out of
 * `components/` because Storybook can't mount the App Router (ARCHITECTURE.md §9).
 */
export function AnimalFiltersNav({ value }: { value: NgoAnimalFilters }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <AnimalFilters
      value={value}
      onChange={(next) =>
        router.push(animalFiltersHref(pathname, next), { scroll: false })
      }
    />
  );
}
