import Link from 'next/link';
import { MessageCircle, PawPrint } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginationNav } from '@/components/ui/pagination-nav';
import { cn } from '@/lib/utils';
import { ngoPageDictionary } from '../ngo-page.dictionary';
import type { NgoAnimalPage } from '../ngo-page.types';
import { AnimalCard } from './animal-card';

const t = ngoPageDictionary.animals;
const ACTION =
  'touch-target inline-flex items-center justify-center gap-2 rounded-full bg-brand-deep px-6 py-3 font-semibold text-on-brand-deep';

export interface AnimalGridProps {
  page: NgoAnimalPage;
  /** False when the NGO has no animal at all (NGO-08). */
  hasAnimals: boolean;
  /** The NGO's WhatsApp, offered when it has no animals (NGO-08). */
  whatsappUrl: string;
  /** The filter controls; they only show when the NGO has animals. */
  filters?: React.ReactNode;
  animalHref: (id: string) => string;
  /** Same filters, another page (NGO-10). */
  pageHref: (page: number) => string;
  /** Page without filters: "Só disponíveis" back on (NGO-09). */
  clearHref: string;
  className?: string;
}

/** The NGO's animals, 12 per page, with the two empty states (NGO-05 to NGO-10). */
export function AnimalGrid({
  page: { data, meta },
  hasAnimals,
  whatsappUrl,
  filters,
  animalHref,
  pageHref,
  clearHref,
  className,
}: AnimalGridProps) {
  return (
    <section
      aria-labelledby="animals-title"
      className={cn('flex flex-col gap-6 text-fg', className)}
    >
      <h2 id="animals-title" className="font-heading text-3xl font-extrabold">
        {t.title}
      </h2>

      {!hasAnimals ? (
        <EmptyState
          title={t.emptyNgo.title}
          description={t.emptyNgo.description}
          illustration={<PawPrint className="size-12" />}
          actions={[
            <a key="whatsapp" href={whatsappUrl} className={ACTION}>
              <MessageCircle aria-hidden="true" className="size-5" />
              {ngoPageDictionary.profile.whatsapp}
            </a>,
          ]}
        />
      ) : (
        <>
          {filters}
          {data.length === 0 ? (
            <EmptyState
              title={t.emptyFiltered.title}
              description={t.emptyFiltered.description}
              actions={[
                <Link key="clear" href={clearHref} className={ACTION}>
                  {t.clear}
                </Link>,
              ]}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {data.map((animal) => (
                <li key={animal.id}>
                  <AnimalCard animal={animal} href={animalHref(animal.id)} />
                </li>
              ))}
            </ul>
          )}
          {meta.last_page > 1 && (
            <PaginationNav
              page={meta.page}
              lastPage={meta.last_page}
              hrefFor={pageHref}
              label={t.pagination.label}
              previousLabel={t.pagination.previous}
              nextLabel={t.pagination.next}
              summary={t.pagination.summary(meta.page, meta.last_page)}
            />
          )}
        </>
      )}
    </section>
  );
}
