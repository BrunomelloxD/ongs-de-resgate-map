import { CircleCheck, Clock, Lock } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const STATUS_BADGE_LABELS = {
  open: 'Aberta agora',
  closed: 'Fechada',
  available: 'Disponível',
  unavailable: 'Indisponível',
} as const;

export type StatusBadgeVariant = keyof typeof STATUS_BADGE_LABELS;

// Colour never carries the meaning alone: every variant has an icon and a text.
// Icons of the figcraft "Badge/*": clock for open and closed, lock for unavailable.
const ICONS = {
  open: Clock,
  available: CircleCheck,
  closed: Clock,
  unavailable: Lock,
} as const;

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        open: 'bg-available-soft text-available-fg',
        available: 'bg-available-soft text-available-fg',
        closed: 'bg-error-soft text-error-fg',
        unavailable: 'bg-surface-2 text-fg-secondary',
      },
    },
  },
);

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  className?: string;
}

export function StatusBadge({ variant, className }: StatusBadgeProps) {
  const Icon = ICONS[variant];

  return (
    <span
      data-slot="status-badge"
      data-variant={variant}
      className={cn(statusBadgeVariants({ variant }), className)}
    >
      <Icon aria-hidden="true" />
      {STATUS_BADGE_LABELS[variant]}
    </span>
  );
}
