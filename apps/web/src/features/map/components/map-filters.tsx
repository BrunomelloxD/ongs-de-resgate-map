import { Chip } from '@/components/ui/chip';
import { ChipSelect } from '@/components/ui/chip-select';
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

const RADIUS_OPTIONS = RADII.map((km) => ({
  value: String(km),
  label: t.filters.radiusOption(km),
}));

const isDefault = (value: MapFilterValues) =>
  !value.openNow &&
  value.radiusKm === DEFAULT_FILTERS.radiusKm &&
  value.species.length === 0;

/**
 * Figcraft 03-mapa-* (M-04, C-15): one row of chips, "✓ Aberta agora", the
 * "Até 5 km ▾" dropdown, "Com cães" and "Com gatos" (MAPF-01 to MAPF-03). The
 * row scrolls sideways on the phone. "Limpar filtros" only shows with a filter on.
 */
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
      className={cn('flex flex-col items-start gap-2', className)}
    >
      <div
        data-slot="map-filters-row"
        className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:w-full lg:flex-wrap lg:overflow-visible lg:px-0"
      >
        <Chip
          pressed={value.openNow}
          onPressedChange={(openNow) => onChange({ ...value, openNow })}
          className="shrink-0"
        >
          {t.filters.openNow}
        </Chip>
        <ChipSelect
          label={t.filters.radius}
          value={String(value.radiusKm)}
          options={RADIUS_OPTIONS}
          onValueChange={(km) =>
            onChange({ ...value, radiusKm: Number(km) as RadiusKm })
          }
        />
        {SPECIES.map((option) => (
          <Chip
            key={option.value}
            pressed={value.species.includes(option.value)}
            onPressedChange={(on) => toggleSpecies(option.value, on)}
            className="shrink-0"
          >
            {option.label}
          </Chip>
        ))}
      </div>
      {!isDefault(value) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="touch-target inline-flex items-center font-semibold text-brand-text underline underline-offset-4"
        >
          {t.filters.clear}
        </button>
      )}
    </section>
  );
}
