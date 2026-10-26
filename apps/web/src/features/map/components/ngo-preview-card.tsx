import Link from 'next/link';
import { Clock, MapPin, PawPrint } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDistance } from '@/lib/format';
import { cn } from '@/lib/utils';
import { mapDictionary as t } from '../map.dictionary';
import type { RankedNgo, TodayHours } from '../map.types';

export const THUMB_SIZE_PX = 80;

export function ngoHref(slug: string): string {
  return `/ong/${slug}`;
}

export function todayHoursText(hours: TodayHours | null): string {
  if (!hours || hours.closed || !hours.opensAt || !hours.closesAt) {
    return t.preview.closedToday;
  }
  return t.preview.todayHours(hours.opensAt, hours.closesAt);
}

/** The NGO's image, or a paw when it has none. Decorative: the name sits beside it. */
export function NgoThumb({ url }: { url: string | null }) {
  const box = 'size-20 shrink-0 rounded-2xl';

  return url ? (
    // The api already serves a 160 px WebP (PERF-02); next/image would re-encode it.
    <img
      src={url}
      alt=""
      width={THUMB_SIZE_PX}
      height={THUMB_SIZE_PX}
      loading="lazy"
      className={cn(box, 'object-cover')}
    />
  ) : (
    <div
      data-slot="ngo-thumb-placeholder"
      aria-hidden="true"
      className={cn(box, 'flex items-center justify-center bg-surface-2')}
    >
      <PawPrint className="size-8 text-fg-muted" />
    </div>
  );
}

export interface NgoPreviewCardProps {
  ngo: RankedNgo;
  className?: string;
}

/** MAP-05: image, name, badge, today's hours, distance and the link to the NGO (MAP-06). */
export function NgoPreviewCard({ ngo, className }: NgoPreviewCardProps) {
  return (
    <article
      data-slot="ngo-preview-card"
      className={cn(
        'flex flex-col gap-4 rounded-3xl bg-surface p-4 text-fg shadow-card',
        className,
      )}
    >
      <div className="flex gap-4">
        <NgoThumb url={ngo.thumbUrl} />
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <h2 className="font-heading text-xl font-bold">{ngo.name}</h2>
          <StatusBadge variant={ngo.openNow ? 'open' : 'closed'} />
          <p className="flex items-center gap-1.5 text-sm text-fg-secondary">
            <Clock aria-hidden="true" className="size-4 shrink-0" />
            {todayHoursText(ngo.todayHours)}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-fg-secondary">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {formatDistance(ngo.distanceKm)}
          </p>
        </div>
      </div>
      <Link
        href={ngoHref(ngo.slug)}
        // Inside the map, leaflet.css colours every link: `!` keeps the button's.
        className={cn(
          buttonVariants({ variant: 'secondary' }),
          'w-full text-on-brand-deep!',
        )}
      >
        {t.preview.cta}
      </Link>
    </article>
  );
}
