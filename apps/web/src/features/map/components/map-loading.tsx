import { Skeleton } from '@/components/ui/skeleton';
import { mapDictionary as t } from '../map.dictionary';
import { SKELETON_ROWS } from './ngo-list';

/**
 * The map screen while the Leaflet chunk downloads (03-mapa-carregando-*):
 * the map's frame with the "searching" pill and, from 1024 px, the list's skeleton.
 */
export function MapLoading() {
  return (
    <div data-slot="map-loading" className="flex min-h-0 flex-1">
      <div
        data-slot="map-loading-list"
        aria-hidden="true"
        className="hidden w-[440px] shrink-0 flex-col gap-4 bg-page px-6 py-6 lg:flex"
      >
        <p className="font-heading text-xl font-bold">{t.list.loading}</p>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div key={i} className="flex gap-4 rounded-3xl bg-surface p-3">
            <Skeleton className="size-20 shrink-0 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-2 py-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-subtle px-4">
        <p
          role="status"
          className="flex items-center gap-3 rounded-full bg-surface px-6 py-3 font-semibold text-fg shadow-md"
        >
          <span
            aria-hidden="true"
            className="size-6 shrink-0 animate-spin rounded-full border-4 border-surface-2 border-t-brand motion-reduce:animate-none"
          />
          {t.mapLoading}
        </p>
      </div>
    </div>
  );
}
