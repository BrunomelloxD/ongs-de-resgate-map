import Link from 'next/link';
import { MapPin, MessageCircle, PawPrint } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatAge } from '@/lib/format';
import { cn } from '@/lib/utils';
import { animalPageDictionary } from '../animal-page.dictionary';
import type { AnimalPublic } from '../animal-page.types';
import { AnimalGallery } from './animal-gallery.client';

const t = animalPageDictionary.detail;

export const NGO_THUMB_SIZE_PX = 56;
const BUTTON =
  'touch-target inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold';

export function ngoHref(slug: string): string {
  return `/ong/${slug}`;
}

export interface AnimalDetailProps {
  animal: AnimalPublic;
  className?: string;
}

/** ANI-01 to ANI-05: photos, data, the NGO and the adoption button. */
export function AnimalDetail({ animal, className }: AnimalDetailProps) {
  const { ngo } = animal;
  const adopt = t.adopt(animal.name, animal.sex);
  const fields = [
    [t.fields.species, t.species[animal.species]],
    [t.fields.breed, animal.breed],
    [t.fields.sex, t.sex[animal.sex]],
    [t.fields.size, t.size[animal.size]],
    [t.fields.age, formatAge(animal.ageValue, animal.ageUnit)],
  ].filter((field): field is [string, string] => Boolean(field[1]));

  return (
    <article
      data-slot="animal-detail"
      className={cn('grid gap-8 text-fg lg:grid-cols-2', className)}
    >
      <AnimalGallery images={animal.images} name={animal.name} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-start gap-2">
          <h1 className="font-heading text-4xl font-extrabold">
            {animal.name}
          </h1>
          <StatusBadge
            variant={animal.available ? 'available' : 'unavailable'}
          />
        </div>

        <dl className="grid grid-cols-2 gap-3">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-surface-2 px-4 py-3">
              <dt className="text-sm text-fg-secondary">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        {/* The api sends whatsappUrl only while the animal is available (ANI-04). */}
        {animal.whatsappUrl ? (
          <a
            href={animal.whatsappUrl}
            className={cn(BUTTON, 'bg-brand-deep text-on-brand-deep')}
          >
            <MessageCircle aria-hidden="true" className="size-5" />
            {adopt}
          </a>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled
              className={cn(BUTTON, 'bg-surface-2 text-fg-secondary')}
            >
              <MessageCircle aria-hidden="true" className="size-5" />
              {adopt}
            </button>
            <p className="text-fg-secondary">{t.unavailable(animal.name)}</p>
            <Link
              href={ngoHref(ngo.slug)}
              className="touch-target inline-flex items-center font-semibold text-brand-text underline underline-offset-4"
            >
              {t.otherAnimals(ngo.name)}
            </Link>
          </div>
        )}

        {animal.description && (
          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-bold">
              {t.about(animal.name)}
            </h2>
            <p className="whitespace-pre-line text-fg-secondary">
              {animal.description}
            </p>
          </section>
        )}

        <section
          data-slot="animal-ngo-card"
          className="flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-card"
        >
          {ngo.imageUrl ? (
            // Decorative: the name sits beside it.
            <img
              src={ngo.imageUrl}
              alt=""
              width={NGO_THUMB_SIZE_PX}
              height={NGO_THUMB_SIZE_PX}
              loading="lazy"
              className="size-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              data-slot="ngo-thumb-placeholder"
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-2"
            >
              <PawPrint className="size-6 text-fg-muted" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm text-fg-secondary">{t.ngoTitle}</p>
            <h2 className="font-heading text-lg font-bold">{ngo.name}</h2>
            <p className="flex items-center gap-1 text-sm text-fg-secondary">
              <MapPin aria-hidden="true" className="size-4" />
              {ngo.city} – {ngo.uf}
            </p>
            <Link
              href={ngoHref(ngo.slug)}
              className="touch-target inline-flex items-center font-semibold text-brand-text underline underline-offset-4"
            >
              {t.ngoLink}
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
