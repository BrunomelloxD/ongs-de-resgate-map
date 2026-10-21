import Link from 'next/link';
import { Plus } from 'lucide-react';
import { toggleAvailability } from '../actions/toggle-availability';
import { AnimalList } from '../components/animal-list.client';
import { FirstAccess } from '../components/first-access';
import { dashboardDictionary } from '../dashboard.dictionary';
import type { MyNgo } from '../dashboard.types';
import { NEW_ANIMAL_PATH } from '../paths';
import { getMyAnimals } from '../queries/get-my-animals';

const t = dashboardDictionary.list;

export interface DashboardContainerProps {
  ngo: MyNgo;
}

/** DASH-01 list, or the first access when there is no animal yet (DASH-07). */
export async function DashboardContainer({ ngo }: DashboardContainerProps) {
  const animals = await getMyAnimals();

  if (animals.length === 0) {
    return (
      <>
        <h1 className="sr-only">{t.title}</h1>
        <FirstAccess ngo={ngo} animalCount={0} />
      </>
    );
  }

  const available = animals.filter((animal) => animal.available).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-extrabold">{t.title}</h1>
          <p className="mt-1 text-fg-secondary">
            {t.summary(animals.length, available)}
          </p>
        </div>
        <Link
          href={NEW_ANIMAL_PATH}
          className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-deep px-6 py-3 font-semibold text-on-brand-deep outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-auto"
        >
          <Plus aria-hidden="true" className="size-5" />
          {t.create}
        </Link>
      </div>
      {/* <Activity> keeps the page mounted: another NGO gets a fresh search and filter. */}
      <AnimalList
        key={ngo.id}
        animals={animals}
        onToggle={toggleAvailability}
      />
    </div>
  );
}
