import { Chip, ChipGroup } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import { DEFAULT_RADIUS_KM, RADII } from '../lib/map-hash';
import { mapDictionary as t } from '../map.dictionary';
import type { MapSpecies, RadiusKm } from '../map.types';

export interface MapFilterValues {
  /** MAPF-01 */
  openNow: boolean;
  /** MAPF-02 */
  radiusKm: RadiusKm;
  /** MAPF-03: NGOs with an available animal of any of these. */
  species: MapSpecies[];
}

export const DEFAULT_FILTERS: MapFilterValues = {
  openNow: false,
  radiusKm: DEFAULT_RADIUS_KM,
  species: [],
};

const SPECIES: readonly { value: MapSpecies; label: string }[] = [
  { value: 'DOG', label: t.filters.dogs },
  { value: 'CAT', label: t.filters.cats },
];

export interface MapFiltersProps {
  value: MapFilterValues;
  onChange: (next: MapFilterValues) => void;
  className?: string;
}

/** "Aberta agora", radius, species and "Limpar filtros" (MAPF-01 to MAPF-04). */
export function MapFilters({ value, onChange, className }: MapFiltersProps) {
  function toggleSpecies(species: MapSpecies, on: boolean) {
    const next = SPECIES.map((option) => option.value).filter((option) =>
      option === species ? on : value.species.includes(option),
    );
    onChange({ ...value, species: next });
  }

  return (
    <section
      aria-label={t.filters.label}
      className={cn('flex flex-col gap-4', className)}
    >
      <div className="flex flex-wrap gap-2">
        <Chip
          pressed={value.openNow}
          onPressedChange={(openNow) => onChange({ ...value, openNow })}
        >
          {t.filters.openNow}
        </Chip>
      </div>
      <ChipGroup label={t.filters.radius}>
        {RADII.map((radiusKm) => (
          <Chip
            key={radiusKm}
            pressed={value.radiusKm === radiusKm}
            // A radius is always chosen: pressing the current one keeps it.
            onPressedChange={() => onChange({ ...value, radiusKm })}
          >
            {t.filters.radiusOption(radiusKm)}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label={t.filters.species}>
        {SPECIES.map((option) => (
          <Chip
            key={option.value}
            pressed={value.species.includes(option.value)}
            onPressedChange={(on) => toggleSpecies(option.value, on)}
          >
            {option.label}
          </Chip>
        ))}
      </ChipGroup>
      <div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="touch-target inline-flex items-center font-semibold text-brand-text underline underline-offset-4"
        >
          {t.filters.clear}
        </button>
      </div>
    </section>
  );
}
