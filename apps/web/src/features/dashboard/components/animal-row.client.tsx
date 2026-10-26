'use client';

import Link from 'next/link';
import { PawPrint, Pencil } from 'lucide-react';
import { useOptimistic, useState, useTransition } from 'react';
import { useAnnounce } from '@/components/ui/live-region.client';
import { Switch } from '@/components/ui/switch';
import { formatAge } from '@/lib/format';
import { animalSrcSet } from '@/lib/image-srcset';
import { cn } from '@/lib/utils';
import { dashboardDictionary } from '../dashboard.dictionary';
import type { MyAnimal, ToggleAvailability } from '../dashboard.types';
import { editAnimalPath } from '../paths';

const t = dashboardDictionary.row;

export interface AnimalRowProps {
  animal: MyAnimal;
  /** Server Action `toggleAvailability`. */
  onToggle: ToggleAvailability;
  className?: string;
}

/** DASH-01: cover, details and the availability switch, saved optimistically (DASH-02, DASH-03). */
export function AnimalRow({ animal, onToggle, className }: AnimalRowProps) {
  const announce = useAnnounce();
  const [, startTransition] = useTransition();
  // Last saved value; a fresh prop from refresh() replaces it.
  const [saved, setSaved] = useState({
    prop: animal.available,
    value: animal.available,
  });
  if (saved.prop !== animal.available) {
    setSaved({ prop: animal.available, value: animal.available });
  }
  const [checked, setOptimistic] = useOptimistic(saved.value);
  const [failed, setFailed] = useState(false);
  const cover = animal.images[0];

  function toggle(next: boolean) {
    setFailed(false);
    startTransition(async () => {
      setOptimistic(next);
      // A dropped request rejects instead of answering { ok: false }.
      const { ok } = await onToggle(animal.id, next).catch(() => ({
        ok: false,
      }));
      if (ok) {
        startTransition(() => setSaved((s) => ({ ...s, value: next })));
        announce(next ? t.available(animal.name) : t.unavailable(animal.name));
      } else {
        // Ending the transition without a new value reverts the switch.
        setFailed(true);
        announce(t.saveError);
      }
    });
  }

  return (
    <li
      data-slot="animal-row"
      className={cn(
        'flex flex-col gap-2 rounded-3xl bg-surface p-3 text-fg shadow-card',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          {cover ? (
            // The api already serves WebP (PERF-02); next/image would re-encode it.
            <img
              src={cover.thumbUrl}
              srcSet={animalSrcSet(cover)}
              sizes="64px"
              alt={cover.alt}
              width={64}
              height={64}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center"
            >
              <PawPrint className="size-6 text-fg-muted" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-lg font-bold">
            {animal.name}
          </h3>
          <p className="text-sm text-fg-secondary">
            {[
              t.speciesOptions[animal.species],
              t.sexOptions[animal.sex],
              t.sizeOptions[animal.size],
              formatAge(animal.ageValue, animal.ageUnit),
            ].join(' · ')}
          </p>
        </div>
        <Switch
          aria-label={t.toggle(animal.name)}
          checked={checked}
          onCheckedChange={toggle}
        />
        <Link
          href={editAnimalPath(animal.id)}
          aria-label={t.edit(animal.name)}
          className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-fg outline-none hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Pencil aria-hidden="true" className="size-5" />
        </Link>
      </div>
      {failed && <p className="px-1 text-sm text-error-fg">{t.saveError}</p>}
    </li>
  );
}
