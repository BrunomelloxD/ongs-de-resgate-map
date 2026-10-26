import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { dashboardDictionary } from '../dashboard.dictionary';
import type { MyNgo } from '../dashboard.types';
import { NEW_ANIMAL_PATH } from '../paths';

const t = dashboardDictionary.firstAccess;

export interface FirstAccessProps {
  ngo: Pick<MyNgo, 'legalName' | 'imageUrl' | 'weekHours'>;
  animalCount: number;
  className?: string;
}

/** DASH-07: CTA and a checklist marked from the current data. */
export function FirstAccess({ ngo, animalCount, className }: FirstAccessProps) {
  const items = [
    // The signup upload can fail without blocking the account, so the image may be missing.
    { label: t.items.image, done: ngo.imageUrl !== null },
    {
      label: t.items.hours,
      // SPEC_DEVIATION: DASH-07 doesn't define "horário" done; at least one open day counts.
      done: ngo.weekHours.some((day) => !day.closed),
    },
    { label: t.items.firstAnimal, done: animalCount > 0 },
  ];

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <EmptyState
        title={t.title(ngo.legalName)}
        description={t.description}
        illustration={<Plus />}
        illustrationTone="brand"
        actions={[
          <Link
            key="cta"
            href={NEW_ANIMAL_PATH}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-full bg-brand-deep px-6 py-3 font-semibold text-on-brand-deep outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Plus aria-hidden="true" className="size-5" />
            {t.cta}
          </Link>,
        ]}
      />
      <section
        aria-labelledby="first-access-checklist"
        className="rounded-3xl bg-surface p-6 text-fg shadow-card"
      >
        <h2
          id="first-access-checklist"
          className="font-heading text-lg font-bold"
        >
          {t.checklistTitle}
        </h2>
        <ul className="mt-4 flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.label}
              data-done={item.done}
              className="flex items-center gap-3"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg border-2',
                  item.done
                    ? 'border-brand-deep bg-brand-deep text-on-brand-deep'
                    : 'border-fg-secondary',
                )}
              >
                {item.done && <Check className="size-4" />}
              </span>
              <span>
                {item.label}
                <span className="sr-only">
                  {`: ${item.done ? t.done : t.pending}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
