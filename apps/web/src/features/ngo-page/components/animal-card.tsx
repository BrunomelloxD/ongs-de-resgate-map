import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatAge } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ngoPageDictionary } from '../ngo-page.dictionary';
import type { NgoAnimal } from '../ngo-page.types';

const t = ngoPageDictionary.animals;

export interface AnimalCardProps {
  animal: NgoAnimal;
  /** The animal's page, e.g. `/ong/patas-do-bairro/animais/{id}`. */
  href: string;
  className?: string;
}

/** Cover (ANI-02), name, species and age; "Indisponível" only when it applies (NGO-07). */
export function AnimalCard({ animal, href, className }: AnimalCardProps) {
  const { cover } = animal;

  return (
    <Link
      href={href}
      data-slot="animal-card"
      className={cn('group flex flex-col gap-2 rounded-3xl text-fg', className)}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface-2">
        {cover ? (
          // The api already serves the 1200 px WebP (PERF-02); next/image would re-encode it.
          <img
            src={cover.url}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div
            data-slot="animal-card-placeholder"
            aria-hidden="true"
            className="flex size-full items-center justify-center"
          >
            <PawPrint className="size-12 text-fg-muted" />
          </div>
        )}
        {!animal.available && (
          <StatusBadge
            variant="unavailable"
            className="absolute top-3 left-3"
          />
        )}
      </div>
      <h3 className="px-1 font-heading text-lg font-bold group-hover:underline">
        {animal.name}
      </h3>
      <p className="px-1 text-sm text-fg-secondary">
        {t.speciesOptions[animal.species]} ·{' '}
        {formatAge(animal.ageValue, animal.ageUnit)}
      </p>
    </Link>
  );
}
