import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { animalSrcSet } from '@/lib/image-srcset';
import { cn } from '@/lib/utils';
import { ngoPageDictionary } from '../ngo-page.dictionary';
import type { NgoAnimal } from '../ngo-page.types';

const t = ngoPageDictionary.animals;
// The grid (animal-grid.tsx): 2 columns below 1024 px, 3 columns of ~220 px above.
const CARD_SIZES = '(min-width: 1024px) 220px, calc(50vw - 24px)';

export interface AnimalCardProps {
  animal: NgoAnimal;
  /** The animal's page, e.g. `/ong/patas-do-bairro/animais/{id}`. */
  href: string;
  className?: string;
}

/**
 * Cover (ANI-02), name, species, sex and size. Figcraft "Card/Animal" (C-23):
 * 3:4 photo with the "Disponível" or "Indisponível" badge on it (NGO-07).
 */
export function AnimalCard({ animal, href, className }: AnimalCardProps) {
  const { cover } = animal;

  return (
    <Link
      href={href}
      data-slot="animal-card"
      className={cn('group flex flex-col gap-2 rounded-3xl text-fg', className)}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-2">
        {cover ? (
          // The api already serves 160/600/1200 px WebP (PERF-02); next/image would re-encode it.
          <img
            src={cover.url}
            srcSet={animalSrcSet(cover)}
            sizes={CARD_SIZES}
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
        <StatusBadge
          variant={animal.available ? 'available' : 'unavailable'}
          className="absolute top-3 left-3"
        />
      </div>
      <h3 className="px-1 font-heading text-lg font-bold group-hover:underline">
        {animal.name}
      </h3>
      <p className="px-1 text-sm text-fg-secondary">
        {[
          t.speciesOptions[animal.species],
          t.sexOptions[animal.sex],
          t.sizeOptions[animal.size],
        ].join(' · ')}
      </p>
    </Link>
  );
}
