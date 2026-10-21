'use client';

import { PawPrint } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { animalPageDictionary } from '../animal-page.dictionary';
import type { AnimalImage } from '../animal-page.types';

const t = animalPageDictionary.gallery;

export const THUMB_SIZE_PX = 64;

export interface AnimalGalleryProps {
  /** Cover (position 0) first, as the api sends them (ANI-02). */
  images: readonly AnimalImage[];
  name: string;
  className?: string;
}

/** ANI-01: cover first, "1/N" counter and clickable thumbnails; arrows move between photos. */
export function AnimalGallery({ images, name, className }: AnimalGalleryProps) {
  const [index, setIndex] = useState(0);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = images[index];

  function select(next: number) {
    setIndex(next);
    thumbs.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    select(Math.min(images.length - 1, Math.max(0, index + step)));
  }

  return (
    <section
      aria-label={t.label(name)}
      className={cn('flex flex-col gap-3', className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface-2">
        {current ? (
          // The api already serves the 1200 px WebP (PERF-02). Above the fold: no lazy.
          <img
            src={current.url}
            alt={current.alt}
            width={current.width}
            height={current.height}
            className="size-full object-cover"
          />
        ) : (
          <div
            data-slot="animal-gallery-placeholder"
            aria-hidden="true"
            className="flex size-full items-center justify-center"
          >
            <PawPrint className="size-16 text-fg-muted" />
          </div>
        )}
        {images.length > 0 && (
          <span className="absolute right-3 bottom-3 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-fg">
            {t.counter(index + 1, images.length)}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                ref={(element) => {
                  thumbs.current[i] = element;
                }}
                type="button"
                aria-label={t.thumb(i + 1, images.length)}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => setIndex(i)}
                onKeyDown={onKeyDown}
                className={cn(
                  'block overflow-hidden rounded-2xl border-3 border-transparent',
                  i === index && 'border-brand-deep',
                )}
              >
                {/* The 160 px variant (AFORM-12). */}
                <img
                  src={image.thumbUrl}
                  alt=""
                  width={THUMB_SIZE_PX}
                  height={THUMB_SIZE_PX}
                  loading="lazy"
                  className="size-16 object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
