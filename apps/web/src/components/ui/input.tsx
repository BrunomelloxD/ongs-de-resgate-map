import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';

/**
 * Design System "Input" (figcraft): 52px, white, 1.5px Contorno border, 12px
 * radius, 16px text; 2px borders on focus and on error, with the ⓘ inside.
 * Shared by Input, Textarea, Select and PasswordInput.
 */
export const fieldClass =
  'w-full min-w-0 rounded-field border-[1.5px] border-line bg-surface px-4 text-base text-fg transition-colors placeholder:text-fg-muted focus-visible:border-2 focus-visible:border-focus disabled:cursor-not-allowed disabled:border-surface-2 disabled:bg-subtle disabled:text-fg-muted aria-invalid:border-2 aria-invalid:border-error aria-invalid:pr-12 aria-invalid:field-invalid-icon';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldClass,
        'min-h-13 py-3 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
