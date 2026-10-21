import { getEnv } from '@/lib/env';
import { AnimalFiltersNav } from '../animal-filters-nav.client';
import { animalFiltersHref, parseAnimalFilters } from '../animal-filters';
import { AnimalGrid } from '../components/animal-grid';
import { NgoProfile } from '../components/ngo-profile';
import { ngoPath } from '../metadata';
import { NgoMiniMap } from '../ngo-mini-map.client';
import type { NgoPublic } from '../ngo-page.types';
import { getNgoAnimals } from '../queries/get-ngo';

export interface NgoPageContainerProps {
  /** Already loaded by the page, before streaming, so a missing slug is a real 404. */
  ngo: NgoPublic;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** NGO-01 to NGO-10: the profile and the animal grid with the URL filters. */
export async function NgoPageContainer({
  ngo,
  searchParams,
}: NgoPageContainerProps) {
  const { filters, page } = parseAnimalFilters(await searchParams);
  const path = ngoPath(ngo.slug);
  const animals = await getNgoAnimals(ngo.slug, filters, page);
  const { TILE_URL, TILE_ATTRIBUTION } = getEnv();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 py-8 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <NgoProfile
        ngo={ngo}
        miniMap={
          <NgoMiniMap
            tileUrl={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            name={ngo.name}
            lat={ngo.lat}
            lng={ngo.lng}
            openNow={ngo.openNow}
          />
        }
      />
      {animals && (
        <AnimalGrid
          page={animals}
          hasAnimals={ngo.hasAnimals}
          whatsappUrl={ngo.whatsappUrl}
          filters={<AnimalFiltersNav value={filters} />}
          animalHref={(id) => `${path}/animais/${id}`}
          pageHref={(next) => animalFiltersHref(path, filters, next)}
          clearHref={path}
        />
      )}
    </div>
  );
}
