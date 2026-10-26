import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './status-badge';

export interface NgoListCardProps {
  /** A 72px square photo (`<img>`); the card rounds and crops it. */
  thumb: React.ReactNode;
  name: string;
  openNow: boolean;
  /** E.g. "1,2 km". */
  distance?: string;
  /** E.g. "Hoje, 9h às 18h". */
  hours: string;
  className?: string;
}

/**
 * Design System "Card/ONG Lista": photo, name, the open/closed badge, the
 * distance, today's hours and a chevron. Only spans, so a link or a button can
 * wrap it.
 */
export function NgoListCard({
  thumb,
  name,
  openNow,
  distance,
  hours,
  className,
}: NgoListCardProps) {
  return (
    <span
      data-slot="ngo-list-card"
      className={cn(
        'flex w-full items-center gap-3.5 rounded-[1.25rem] bg-surface p-3 text-left text-fg',
        className,
      )}
    >
      <span className="size-18 shrink-0 overflow-hidden rounded-2xl bg-subtle [&>img]:size-full [&>img]:object-cover">
        {thumb}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="font-heading text-lg leading-6 font-bold">{name}</span>
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <StatusBadge variant={openNow ? 'open' : 'closed'} />
          {distance}
        </span>
        <span className="text-sm text-fg-secondary">{hours}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-6 shrink-0 text-fg-secondary"
      />
    </span>
  );
}
