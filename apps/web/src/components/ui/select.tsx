import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldClass } from './input';

/** Design System "Input/Select": native `<select>` with the DS chevron. */
export function Select({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <span data-slot="select" className="relative flex w-full">
      <select
        className={cn(
          fieldClass,
          'min-h-13 appearance-none py-3 pr-12 aria-invalid:pr-20 aria-invalid:bg-[position:right_3rem_center]',
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-fg-muted"
      />
    </span>
  );
}
