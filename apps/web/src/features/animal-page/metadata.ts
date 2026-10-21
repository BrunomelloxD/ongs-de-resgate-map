import 'server-only';
import type { Metadata } from 'next';
import { getEnv } from '@/lib/env';
import { animalPageDictionary } from './animal-page.dictionary';
import type { AnimalPublic } from './animal-page.types';

export function animalPath(slug: string, id: string): string {
  return `/ong/${slug}/animais/${id}`;
}

/** SHARE-04: og:title, og:description, og:image (the cover, ANI-02) and the canonical, all absolute. */
export function animalMetadata(animal: AnimalPublic): Metadata {
  const base = getEnv().PUBLIC_WEB_URL;
  const url = new URL(animalPath(animal.ngo.slug, animal.id), base).toString();
  const description =
    animal.description ??
    animalPageDictionary.metaDescription(animal.name, animal.ngo.name);
  const cover = animal.images[0];

  return {
    title: `${animal.name} · ${animal.ngo.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: animal.name,
      description,
      images: cover
        ? [
            {
              url: new URL(cover.url, base).toString(),
              width: cover.width,
              height: cover.height,
              alt: cover.alt,
            },
          ]
        : [],
    },
  };
}
