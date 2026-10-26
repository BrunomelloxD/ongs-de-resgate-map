import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChipSelectOption {
  value: string;
  label: string;
}

export interface ChipSelectProps {
  /** Accessible name, e.g. "Distância" or "Espécie". */
  label: string;
  value: string;
  options: readonly ChipSelectOption[];
  onValueChange: (value: string) => void;
  /** What the chip shows; defaults to the chosen option, e.g. "Até 5 km". */
  display?: string;
  /** Filled, like a pressed Chip, when the choice narrows the results. */
  active?: boolean;
  className?: string;
}

/**
 * Design System "Chip/Dropdown" ("Até 5 km ▾", "Espécie ▾"): a chip over a
 * native `<select>`, so the keyboard, screen readers and the phone's picker
 * all work as usual.
 */
export function ChipSelect({
  label,
  value,
  options,
  onValueChange,
  display,
  active = false,
  className,
}: ChipSelectProps) {
  const shown =
    display ?? options.find((option) => option.value === value)?.label;

  return (
    <span
      data-slot="chip-select"
      data-active={active || undefined}
      className={cn(
        'touch-target relative inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-line bg-surface px-4 text-sm font-semibold whitespace-nowrap text-fg transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus hover:bg-subtle',
        active &&
          'border-brand-deep bg-brand-deep text-on-brand-deep hover:bg-brand-deep',
        className,
      )}
    >
      <span aria-hidden="true">{shown}</span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="absolute -inset-[1.5px] cursor-pointer appearance-none rounded-full opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}
