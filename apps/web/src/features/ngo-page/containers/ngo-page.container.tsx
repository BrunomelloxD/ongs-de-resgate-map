import { getEnv } from '@/lib/env';
import { AnimalFiltersNav } from '../animal-filters-nav.client';
import { animalFiltersHref, parseAnimalFilters } from '../animal-filters';
import { AnimalGrid } from '../components/animal-grid';
import { NgoCover } from '../components/ngo-cover';
import { NgoProfile } from '../components/ngo-profile';
import { ngoPath, ngoShare } from '../metadata';
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
  // O-05: "{n} animais · {m} disponíveis agora", asked along with the page.
  const [animals, all, available] = await Promise.all([
    getNgoAnimals(ngo.slug, filters, page),
    ngo.hasAnimals ? getNgoAnimals(ngo.slug, { available: false }, 1) : null,
    ngo.hasAnimals ? getNgoAnimals(ngo.slug, { available: true }, 1) : null,
  ]);
  const counts =
    all && available
      ? { total: all.meta.total, available: available.meta.total }
      : undefined;
  const { TILE_URL, TILE_ATTRIBUTION } = getEnv();

  return (
    <div data-slot="ngo-page" className="flex flex-1 flex-col">
      <NgoCover ngo={ngo} share={ngoShare(ngo)} backHref="/" />
      {/* The gutter goes on the full-width wrapper, never on the max-w grid (T166). */}
      <div className="px-gutter pb-16 lg:pb-24">
        <div className="mx-auto grid w-full max-w-[75rem] grid-cols-1 gap-y-10 lg:grid-cols-[25rem_minmax(0,1fr)] lg:gap-x-20 lg:gap-y-10">
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
              // Figcraft 04 (O-04): after the summary on the phone; the right column on desktop.
              className="order-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-20"
              page={animals}
              hasAnimals={ngo.hasAnimals}
              whatsappUrl={ngo.whatsappUrl}
              ngoName={ngo.name}
              counts={counts}
              filters={<AnimalFiltersNav value={filters} />}
              animalHref={(id) => `${path}/animais/${id}`}
              pageHref={(next) => animalFiltersHref(path, filters, next)}
              clearHref={path}
            />
          )}
        </div>
      </div>
    </div>
  );
}
