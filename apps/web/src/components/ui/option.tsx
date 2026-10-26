import { cn } from '@/lib/utils';

export type OptionProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'className'
> & {
  children: React.ReactNode;
  className?: string;
};

/**
 * Design System "Option": a radio drawn as a 52px card with a 12px radius,
 * filled in verde-mata when checked. The radio stays in the a11y tree.
 */
export function Option({ children, className, ...props }: OptionProps) {
  return (
    <label
      data-slot="option"
      className={cn(
        'flex min-h-13 cursor-pointer items-center justify-center rounded-field border-[1.5px] border-line bg-surface px-4 py-3 text-center text-base font-bold text-fg has-checked:border-brand-deep has-checked:bg-brand-deep has-checked:text-on-brand-deep has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus has-aria-invalid:border-2 has-aria-invalid:border-error',
        className,
      )}
    >
      <input type="radio" className="sr-only" {...props} />
      {children}
    </label>
  );
}
