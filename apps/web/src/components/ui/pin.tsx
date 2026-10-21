import { cn } from '@/lib/utils';

// SPEC_DEVIATION: MAP-03 doesn't name the pins' accessible labels.
// Reason: plain description of each state; callers can pass the NGO name in `label`.
export const PIN_LABELS = {
  open: 'ONG aberta agora',
  closed: 'ONG fechada agora',
  selected: 'ONG selecionada',
  visitor: 'Sua localização',
} as const;

export type PinVariant = keyof typeof PIN_LABELS;

/** Width and height in px; the tip of the drop (or the circle's centre) is the anchor. */
export const PIN_SIZES: Record<PinVariant, readonly [number, number]> = {
  open: [32, 40],
  closed: [32, 40],
  selected: [44, 55],
  visitor: [24, 24],
};

const DROP = 'M16 39C16 39 2 24.5 2 15a14 14 0 0 1 28 0c0 9.5-14 24-14 24Z';

export interface PinProps {
  variant: PinVariant;
  /** Overrides the default label, e.g. "Patas do Bairro, aberta agora". */
  label?: string;
  className?: string;
}

/** MAP-03: open, closed, selected and visitor differ by shape, not only by colour. */
export function Pin({ variant, label, className }: PinProps) {
  const [width, height] = PIN_SIZES[variant];

  return (
    <svg
      role="img"
      aria-label={label ?? PIN_LABELS[variant]}
      data-slot="pin"
      data-variant={variant}
      width={width}
      height={height}
      viewBox={variant === 'visitor' ? '0 0 24 24' : '0 0 32 40'}
      className={cn('block overflow-visible drop-shadow-md', className)}
    >
      {variant === 'visitor' && (
        <>
          <circle cx="12" cy="12" r="11" className="fill-brand-deep/25" />
          <circle
            cx="12"
            cy="12"
            r="6.5"
            strokeWidth="3"
            className="fill-brand-deep stroke-surface"
          />
        </>
      )}
      {variant === 'open' && (
        <>
          <path
            d={DROP}
            strokeWidth="2"
            className="fill-brand-deep stroke-surface"
          />
          <circle cx="16" cy="15" r="5.5" className="fill-brand" />
        </>
      )}
      {variant === 'closed' && (
        <>
          <path
            d={DROP}
            strokeWidth="2"
            className="fill-surface stroke-fg-muted"
          />
          <path
            d="M12 11l8 8M20 11l-8 8"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-fg-muted"
          />
        </>
      )}
      {variant === 'selected' && (
        <>
          <path
            d={DROP}
            strokeWidth="2.5"
            className="fill-brand stroke-brand-deep"
          />
          <circle cx="16" cy="15" r="6" className="fill-brand-deep" />
        </>
      )}
    </svg>
  );
}
