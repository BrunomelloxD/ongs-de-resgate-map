import { useSyncExternalStore } from 'react';

/** MAP-08 / MAP-09: the list is a side column from 1024 px, a bottom sheet below. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}
