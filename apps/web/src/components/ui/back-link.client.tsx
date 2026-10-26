'use client';

import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BackLinkProps {
  /** Where to go when there is no page of this site to go back to. */
  href: string;
  label: string;
  className?: string;
}

/**
 * The round ← floating over a photo (figcraft 04 and 05, phone). Goes back in
 * the history when the visitor came from this site (keeping the map's area);
 * a shared link opened cold goes to `href`.
 */
export function BackLink({ href, label, className }: BackLinkProps) {
  function back(event: React.MouseEvent<HTMLAnchorElement>) {
    const sameSite =
      document.referrer !== '' &&
      new URL(document.referrer).origin === window.location.origin;
    if (!sameSite) return;
    event.preventDefault();
    window.history.back();
  }

  return (
    <a
      href={href}
      aria-label={label}
      onClick={back}
      className={cn(
        'touch-target inline-flex items-center justify-center rounded-full bg-surface text-fg shadow-card',
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-6" />
    </a>
  );
}
