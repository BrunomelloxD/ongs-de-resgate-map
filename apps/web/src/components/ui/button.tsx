import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

// Design System "Botões" (figcraft): pill, 52px tall (44px small), bold label.
// Border colour lives in each variant, so buttonVariants() on a link needs no class merging.
// The 3px focus outline comes from the global :focus-visible rule (A11Y-03).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] font-bold whitespace-nowrap transition-colors select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:border-transparent disabled:bg-surface-2 disabled:text-fg-disabled data-[disabled]:pointer-events-none data-[disabled]:border-transparent data-[disabled]:bg-surface-2 data-[disabled]:text-fg-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand text-on-brand hover:bg-brand/85',
        outline: 'border-fg bg-transparent text-fg hover:bg-subtle',
        secondary:
          'border-transparent bg-brand-deep text-on-brand-deep hover:bg-brand-deep-pressed',
        ghost: 'border-transparent text-fg hover:bg-subtle',
        destructive:
          'border-transparent bg-danger text-on-danger hover:bg-danger/90',
        link: 'border-transparent text-brand-text underline underline-offset-4',
        /** Only on buttons that open WhatsApp (C-24). */
        whatsapp:
          'border-transparent bg-whatsapp text-on-whatsapp hover:bg-whatsapp-pressed',
      },
      size: {
        default: 'min-h-13 gap-2 px-6 py-3.5 text-base leading-5',
        lg: 'min-h-13 gap-2 px-6 py-3.5 text-base leading-5',
        sm: "min-h-11 gap-2 px-[1.125rem] py-2.5 text-sm leading-[1.125rem] [&_svg:not([class*='size-'])]:size-4",
        xs: "min-h-11 gap-1 px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        icon: 'size-11 min-h-11 min-w-11',
        'icon-xs':
          "size-11 min-h-11 min-w-11 [&_svg:not([class*='size-'])]:size-4",
        'icon-sm': 'size-11 min-h-11 min-w-11',
        'icon-lg': 'size-13 min-h-13 min-w-13',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
