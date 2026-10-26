import { Toggle } from '@base-ui/react/toggle';
import { Check } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export type ChipProps = Toggle.Props;

/**
 * Design System "Chip": toggle button (`aria-pressed`) for filters, with ✓ when
 * selected. Base UI handles Space and Enter.
 */
export function Chip({ className, children, ...props }: ChipProps) {
  return (
    <Toggle
      data-slot="chip"
      className={cn(
        'group/chip touch-target inline-flex items-center justify-center gap-1.5 rounded-full border-[1.5px] border-line bg-surface px-4 text-sm font-semibold whitespace-nowrap text-fg transition-colors select-none hover:bg-subtle disabled:pointer-events-none disabled:opacity-50 data-[pressed]:border-brand-deep data-[pressed]:bg-brand-deep data-[pressed]:text-on-brand-deep',
        className,
      )}
      {...props}
    >
      <Check
        aria-hidden="true"
        data-slot="chip-check"
        className="hidden size-4 shrink-0 group-data-[pressed]/chip:block"
      />
      {children}
    </Toggle>
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
