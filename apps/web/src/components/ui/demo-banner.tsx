import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuardedLink } from './unsaved-changes.client';

export const DEMO_INFO_PATH = '/sobre-a-demo';

export function demoBannerText(days: number): string {
  return `Demonstração: os dados são apagados em ${days} dias`;
}

export interface DemoBannerProps {
  /** `DEMO_RETENTION_DAYS` from the api (DEMO-01). */
  days: number;
  className?: string;
}

// SPEC_DEVIATION: DEMO-01 doesn't name the link text.
// Reason: the whole sentence is the link, so no extra text was invented.
export function DemoBanner({ days, className }: DemoBannerProps) {
  return (
    <div
      data-slot="demo-banner"
      className={cn('bg-gem-soft text-gem-soft-fg', className)}
    >
      {/* DIRTY-01: the banner shows on the forms too. */}
      <GuardedLink
        href={DEMO_INFO_PATH}
        className="touch-target flex items-center justify-center gap-2 px-gutter py-2 text-center text-sm font-semibold underline-offset-4 hover:underline"
      >
        <Info aria-hidden="true" className="size-4 shrink-0" />
        {demoBannerText(days)}
      </GuardedLink>
    </div>
  );
}
