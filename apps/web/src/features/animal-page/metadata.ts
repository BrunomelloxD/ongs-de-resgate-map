import 'server-only';
import type { Metadata } from 'next';
import { getEnv } from '@/lib/env';
import { animalPageDictionary } from './animal-page.dictionary';
import type { AnimalPublic } from './animal-page.types';

export function animalPath(slug: string, id: string): string {
  return `/ong/${slug}/animais/${id}`;
}

function animalDescription(animal: AnimalPublic): string {
  return (
    animal.description ??
    animalPageDictionary.metaDescription(animal.name, animal.ngo.name)
  );
}

/** SHARE-01: what the "Compartilhar" button sends; the same text and canonical URL as the tags. */
export function animalShare(animal: AnimalPublic): {
  title: string;
  text: string;
  url: string;
} {
  const url = new URL(
    animalPath(animal.ngo.slug, animal.id),
    getEnv().PUBLIC_WEB_URL,
  ).toString();
  return {
    title: `${animal.name} · ${animal.ngo.name}`,
    text: animalDescription(animal),
    url,
  };
}

/** SHARE-04: og:title, og:description, og:image (the cover, ANI-02) and the canonical, all absolute. */
export function animalMetadata(animal: AnimalPublic): Metadata {
  const base = getEnv().PUBLIC_WEB_URL;
  const { title, url, text: description } = animalShare(animal);
  const cover = animal.images[0];

  return {
    title,
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
