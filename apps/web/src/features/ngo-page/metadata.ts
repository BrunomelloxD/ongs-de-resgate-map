import 'server-only';
import type { Metadata } from 'next';
import { getEnv } from '@/lib/env';
import type { NgoPublic } from './ngo-page.types';

export function ngoPath(slug: string): string {
  return `/ong/${slug}`;
}

/** SHARE-04: og:title, og:description, og:image (the NGO's image) and the canonical, all absolute. */
export function ngoMetadata(ngo: NgoPublic): Metadata {
  const base = getEnv().PUBLIC_WEB_URL;
  const url = new URL(ngoPath(ngo.slug), base).toString();

  return {
    title: ngo.name,
    description: ngo.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: ngo.name,
      description: ngo.description,
      images: ngo.imageUrl ? [new URL(ngo.imageUrl, base).toString()] : [],
    },
  };
}
