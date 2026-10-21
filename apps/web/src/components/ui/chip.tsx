import { Toggle } from '@base-ui/react/toggle';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export type ChipProps = Toggle.Props;

/** Toggle button (`aria-pressed`) for filters. Base UI handles Space and Enter. */
export function Chip({ className, ...props }: ChipProps) {
  return (
    <Toggle
      data-slot="chip"
      className={cn(
        'touch-target inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-semibold whitespace-nowrap text-fg transition-colors select-none hover:bg-subtle disabled:pointer-events-none disabled:opacity-50 data-[pressed]:border-brand-deep data-[pressed]:bg-brand-deep data-[pressed]:text-on-brand-deep',
        className,
      )}
      {...props}
    />
  );
}

export interface ChipGroupProps {
  /** Visible label, also the accessible name of the group. */
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function ChipGroup({ label, children, className }: ChipGroupProps) {
  const labelId = useId();

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span id={labelId} className="text-sm font-bold text-fg">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        data-slot="chip-group"
        className="flex flex-wrap gap-2"
      >
        {children}
      </div>
    </div>
  );
}
