import { useEffect, useState } from 'react';
import { roundBboxOutward, type Bbox } from '@/lib/geo';
import { fetchNgos, type SearchNgos } from '../lib/fetch-ngos';
import type { MapSpecies, NgoPin } from '../map.types';

/** MAP-17: search the new area 400 ms after the last move. */
export const SEARCH_DEBOUNCE_MS = 400;

export type NgoSearchStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface NgoSearch {
  status: NgoSearchStatus;
  items: NgoPin[];
  /** The bbox had more than 200 NGOs; only the nearest came (Edge Cases). */
  truncated: boolean;
  retry: () => void;
}

interface Result {
  key: string;
  status: Exclude<NgoSearchStatus, 'loading'>;
  items: NgoPin[];
  truncated: boolean;
}

/**
 * Debounced, cancellable search of the visible area (MAP-12, MAP-16, MAP-17).
 * Only the bbox, rounded outward, and the species leave the browser (SEC-01).
 */
export function useNgoSearch(
  bbox: Bbox | null,
  species: readonly MapSpecies[],
  search: SearchNgos = fetchNgos,
): NgoSearch {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  // Same rounded area and species → same key: small pans don't search again.
  const area = bbox && roundBboxOutward(bbox).join(',');
  const list = species.join(',');
  const key = `${area}|${list}#${attempt}`;

  useEffect(() => {
    if (!area) return;
    const controller = new AbortController();
    // A cancelled request is stale: its answer must not replace the current one.
    const settle = (next: Omit<Result, 'key'>) => {
      if (!controller.signal.aborted) setResult({ key, ...next });
    };

    const timer = setTimeout(() => {
      search(
        {
          bbox: area.split(',').map(Number) as Bbox,
          species: list ? (list.split(',') as MapSpecies[]) : [],
        },
        controller.signal,
      ).then(
        ({ items, truncated }) =>
          settle({
            status: items.length > 0 ? 'ready' : 'empty',
            items,
            truncated,
          }),
        () => settle({ status: 'error', items: [], truncated: false }),
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [area, list, key, search]);

  const current = result?.key === key ? result : null;

  return {
    status: current?.status ?? 'loading',
    items: current?.items ?? [],
    truncated: current?.truncated ?? false,
    retry: () => setAttempt((n) => n + 1),
  };
}
