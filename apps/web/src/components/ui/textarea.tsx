import { cn } from '@/lib/utils';
import { fieldClass } from './input';

/** Design System "Input/Textarea": grows with the text, no resize handle. */
export function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldClass,
        'field-sizing-content min-h-30 resize-none py-3 aria-invalid:bg-[position:right_1rem_top_0.875rem]',
        className,
      )}
      {...props}
    />
  );
}
