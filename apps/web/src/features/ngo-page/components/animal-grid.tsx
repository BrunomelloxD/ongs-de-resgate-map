import Link from 'next/link';
import { Heart } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginationNav } from '@/components/ui/pagination-nav';
import { cn } from '@/lib/utils';
import { ngoPageDictionary } from '../ngo-page.dictionary';
import type { NgoAnimalPage } from '../ngo-page.types';
import { AnimalCard } from './animal-card';

const t = ngoPageDictionary.animals;
const ACTION = buttonVariants();

export interface AnimalGridProps {
  page: NgoAnimalPage;
  /** False when the NGO has no animal at all (NGO-08). */
  hasAnimals: boolean;
  /** The NGO's WhatsApp, offered when it has no animals (NGO-08). */
  whatsappUrl: string;
  /** The NGO's name, for the empty state (O-07). */
  ngoName: string;
  /** "{n} animais · {m} disponíveis agora" (O-05); left out when unknown. */
  counts?: { total: number; available: number };
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
  ngoName,
  counts,
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
      <div className="flex flex-col gap-1">
        <h2
          id="animals-title"
          className="font-heading text-2xl font-extrabold lg:text-4xl"
        >
          {t.title}
        </h2>
        {hasAnimals && counts && (
          <p className="text-fg-secondary">
            {t.count(counts.total, counts.available)}
          </p>
        )}
      </div>

      {!hasAnimals ? (
        <EmptyState
          layout="card"
          title={t.emptyNgo.title(ngoName)}
          description={t.emptyNgo.description}
          illustration={<Heart />}
          actions={[
            <a
              key="whatsapp"
              href={whatsappUrl}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t.emptyNgo.ask}
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
            <ul className="grid grid-cols-2 gap-x-3.5 gap-y-6 lg:grid-cols-3 lg:gap-6">
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
