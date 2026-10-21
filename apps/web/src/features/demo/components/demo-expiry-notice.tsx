import { Clock } from 'lucide-react';
import { daysUntil, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { demoDictionary } from '../demo.dictionary';

export interface DemoExpiryNoticeProps {
  /** `expiresAt` of the NGO; null with the demo off (DEMO-20). */
  expiresAt: string | null;
  /** Passed in so the component stays pure (no clock in render). */
  now: Date | string;
  className?: string;
}

/** DEMO-06: date of the automatic deletion and the days left, rounded up. */
export function DemoExpiryNotice({
  expiresAt,
  now,
  className,
}: DemoExpiryNoticeProps) {
  if (!expiresAt) return null;

  return (
    <p
      data-slot="demo-expiry-notice"
      className={cn(
        'flex items-center gap-2 rounded-2xl bg-gem-soft px-4 py-3 text-sm font-semibold text-gem-soft-fg',
        className,
      )}
    >
      <Clock aria-hidden="true" className="size-4 shrink-0" />
      {demoDictionary.expiry(formatDate(expiresAt), daysUntil(expiresAt, now))}
    </p>
  );
}
