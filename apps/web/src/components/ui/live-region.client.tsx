'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Announce = (message: string) => void;

const AnnounceContext = createContext<Announce | null>(null);

/** Announces async messages in an `aria-live="polite"` region (A11Y-06). */
export function LiveRegion({ children }: { children: React.ReactNode }) {
  const [announcement, setAnnouncement] = useState<{
    id: number;
    message: string;
  } | null>(null);

  const announce = useCallback<Announce>((message) => {
    setAnnouncement((previous) => ({
      id: (previous?.id ?? 0) + 1,
      message,
    }));
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {/* A new key mounts a new node, so a repeated text is read again. */}
        {announcement && <p key={announcement.id}>{announcement.message}</p>}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce(): Announce {
  const announce = useContext(AnnounceContext);
  if (!announce)
    throw new Error('useAnnounce precisa estar dentro de <LiveRegion>.');

  return announce;
}
