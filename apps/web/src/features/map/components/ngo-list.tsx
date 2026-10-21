import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDistance } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { NgoSearchStatus } from '../hooks/use-ngo-search';
import { mapDictionary as t } from '../map.dictionary';
import type { RankedNgo } from '../map.types';
import { NgoThumb, todayHoursText } from './ngo-preview-card';

export const SKELETON_ROWS = 4;

const PRIMARY =
  'touch-target inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 font-semibold text-on-brand';
const SECONDARY =
  'touch-target inline-flex items-center justify-center rounded-full border-2 border-fg px-6 py-3 font-semibold text-fg';

export interface NgoListProps {
  status: NgoSearchStatus;
  /** Already ranked and filtered (`rankNgos`). */
  items: readonly RankedNgo[];
  radiusKm: number;
  /** "Aberta agora" or a species is on: an empty list offers "Limpar filtros" (MAPF-04). */
  filtered: boolean;
  /** More than 200 NGOs in the area (Edge Cases). */
  truncated: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
  /** Leave it out at the widest radius: there is nothing wider (MAP-14). */
  onWiden?: () => void;
  onClearFilters: () => void;
  /** Where "Buscar outra cidade" goes (MAP-13). */
  otherCityHref: string;
  className?: string;
}

/** The NGOs of the map, reachable by keyboard and screen reader (A11Y-08). */
export function NgoList({
  status,
  items,
  radiusKm,
  filtered,
  truncated,
  selectedId,
  onSelect,
  onRetry,
  onWiden,
  onClearFilters,
  otherCityHref,
  className,
}: NgoListProps) {
  const box = cn('flex flex-col gap-4 text-fg', className);

  if (status === 'loading') {
    return (
      <div data-slot="ngo-list" className={box}>
        <p role="status" className="font-heading text-xl font-bold">
          {t.list.loading}
        </p>
        <ul aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <li key={i} className="flex gap-4 rounded-3xl bg-surface p-3">
              <Skeleton className="size-20 shrink-0 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2 py-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div data-slot="ngo-list" className={box}>
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-error-soft p-6">
          <p role="alert" className="font-heading text-xl font-bold">
            {t.list.error.title}
          </p>
          <button type="button" className={PRIMARY} onClick={onRetry}>
            {t.list.error.retry}
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div data-slot="ngo-list" className={box}>
        {filtered ? (
          <EmptyState
            title={t.list.emptyFiltered.title}
            description={t.list.emptyFiltered.description}
            actions={[
              <button
                key="clear"
                type="button"
                className={PRIMARY}
                onClick={onClearFilters}
              >
                {t.list.emptyFiltered.clear}
              </button>,
            ]}
          />
        ) : (
          <EmptyState
            title={t.list.empty.title}
            description={t.list.empty.description}
            actions={[
              onWiden ? (
                <button
                  key="widen"
                  type="button"
                  className={PRIMARY}
                  onClick={onWiden}
                >
                  {t.list.empty.widen}
                </button>
              ) : null,
              <Link key="city" href={otherCityHref} className={SECONDARY}>
                {t.list.empty.otherCity}
              </Link>,
            ]}
          />
        )}
      </div>
    );
  }

  return (
    <div data-slot="ngo-list" className={box}>
      <div>
        <h2 className="font-heading text-2xl font-extrabold">
          {t.list.title(items.length)}
        </h2>
        <p className="text-sm text-fg-secondary">{t.list.radius(radiusKm)}</p>
      </div>
      {truncated && (
        <p className="rounded-2xl bg-subtle p-3 text-sm font-semibold">
          {t.list.truncated}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((ngo) => {
          const selected = ngo.id === selectedId;
          return (
            <li key={ngo.id}>
              <button
                type="button"
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(ngo.id)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-3xl border-2 bg-surface p-3 text-left',
                  selected ? 'border-brand-deep' : 'border-transparent',
                )}
              >
                <NgoThumb url={ngo.thumbUrl} />
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span className="font-heading text-lg font-bold">
                    {ngo.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <StatusBadge variant={ngo.openNow ? 'open' : 'closed'} />
                    {formatDistance(ngo.distanceKm)}
                  </span>
                  <span className="text-sm text-fg-secondary">
                    {todayHoursText(ngo.todayHours)}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-fg-secondary"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
