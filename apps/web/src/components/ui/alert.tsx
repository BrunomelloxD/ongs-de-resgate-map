import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  info: { icon: Info, box: 'bg-gem-soft', title: 'text-gem-soft-fg' },
  error: { icon: CircleAlert, box: 'bg-error-soft', title: 'text-error-fg' },
  success: {
    icon: CircleCheck,
    box: 'bg-available-soft',
    title: 'text-available-fg',
  },
} as const;

export type AlertVariant = keyof typeof VARIANTS;

export interface AlertProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  variant: AlertVariant;
  title: React.ReactNode;
  /** Supporting text under the title. */
  children?: React.ReactNode;
}

/** Design System "Alert/Info", "Alert/Erro" and "Alert/Sucesso": icon, bold title and text. */
export function Alert({
  variant,
  title,
  children,
  className,
  ...props
}: AlertProps) {
  const { icon: Icon, box, title: titleClass } = VARIANTS[variant];

  return (
    <div
      data-slot="alert"
      data-variant={variant}
      className={cn('flex gap-3 rounded-[1rem] p-4 text-fg', box, className)}
      {...props}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-6 shrink-0', titleClass)}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={cn('text-base font-bold', titleClass)}>{title}</p>
        {children && <div className="text-sm">{children}</div>}
      </div>
    </div>
  );
}
