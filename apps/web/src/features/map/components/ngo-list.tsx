import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDistance } from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NgoSearchStatus } from '../hooks/use-ngo-search';
import { mapDictionary as t } from '../map.dictionary';
import type { RankedNgo } from '../map.types';
import { NgoThumb, todayHoursText } from './ngo-preview-card';

export const SKELETON_ROWS = 4;

const SECONDARY = buttonVariants({ variant: 'outline' });

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
  /** The filters, between the title and the NGOs (figcraft 03-mapa-*). */
  filters?: React.ReactNode;
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
  filters,
  className,
}: NgoListProps) {
  const box = cn('flex flex-col gap-4 text-fg', className);

  if (status === 'loading') {
    return (
      <div data-slot="ngo-list" className={box}>
        <div>
          <p role="status" className="font-heading text-2xl font-extrabold">
            {t.list.loading}
          </p>
          <p className="text-sm text-fg-secondary">{t.list.loadingHint}</p>
        </div>
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
          <Button type="button" onClick={onRetry}>
            {t.list.error.retry}
          </Button>
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
              <Button
                key="clear"
                type="button"

                onClick={onClearFilters}
              >
                {t.list.emptyFiltered.clear}
              </Button>,
            ]}
          />
        ) : (
          <EmptyState
            title={t.list.empty.title}
            description={t.list.empty.description}
            illustration={<Search />}
            actions={[
              onWiden ? (
                <Button
                  key="widen"
                  type="button"

                  onClick={onWiden}
                >
                  {t.list.empty.widen}
                </Button>
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
      {filters}
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
