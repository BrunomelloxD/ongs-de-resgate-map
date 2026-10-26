import { useId } from 'react';
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

/** Width and height in px (figcraft "Pin/*"); the tip of the drop (or the circle's centre) is the anchor. */
export const PIN_SIZES: Record<PinVariant, readonly [number, number]> = {
  open: [30, 39],
  closed: [30, 39],
  selected: [48, 62],
  visitor: [44, 44],
};

/** The Design System drop, drawn in a 100×130 box and scaled to each size. */
export const DROP_PATH =
  'M50 130C50 130 0 80 0 50C0 22.39 22.39 0 50 0C77.61 0 100 22.39 100 50C100 80 50 130 50 130Z';

// Shadow of the figcraft pins: 0 3px 6px Tinta at 25%.
const SHADOW = 'drop-shadow-[0_3px_6px_rgb(23_36_30/0.25)]';

export interface PinProps {
  variant: PinVariant;
  /** Overrides the default label, e.g. "Patas do Bairro, aberta agora". */
  label?: string;
  /** NGO photo drawn inside the selected pin; without it, a verde-mata dot. */
  photoUrl?: string | null;
  className?: string;
}

/**
 * MAP-03, figcraft "Pin/*": open is verde-mata with a yellow dot, closed is grey
 * with a light dot, selected is a bigger yellow drop with the NGO photo, and the
 * visitor is a blue dot with a halo.
 */
export function Pin({ variant, label, photoUrl, className }: PinProps) {
  const [width, height] = PIN_SIZES[variant];
  // Valid in url(#…) whatever characters useId() uses.
  const clipId = `pin-${useId().replace(/[^\w-]/g, '')}`;
  const visitor = variant === 'visitor';

  return (
    <svg
      role="img"
      aria-label={label ?? PIN_LABELS[variant]}
      data-slot="pin"
      data-variant={variant}
      width={width}
      height={height}
      viewBox={visitor ? '0 0 44 44' : '0 0 100 130'}
      className={cn('block overflow-visible', !visitor && SHADOW, className)}
    >
      {visitor && (
        <>
          <circle cx="22" cy="22" r="22" className="fill-visitor/20" />
          <circle cx="22" cy="22" r="10" className="fill-white" />
          <circle cx="22" cy="22" r="7" className="fill-visitor" />
        </>
      )}
      {variant === 'open' && (
        <>
          <path d={DROP_PATH} className="fill-pin-open" />
          <circle cx="50" cy="50" r="19" className="fill-brand" />
        </>
      )}
      {variant === 'closed' && (
        <>
          <path d={DROP_PATH} className="fill-pin-closed" />
          <circle cx="50" cy="50" r="19" className="fill-pin-closed-dot" />
        </>
      )}
      {variant === 'selected' && (
        <>
          <path d={DROP_PATH} className="fill-brand" />
          {photoUrl ? (
            <>
              <clipPath id={clipId}>
                <path
                  d={DROP_PATH}
                  transform="translate(8.333 8.333) scale(0.8333)"
                />
              </clipPath>
              <image
                href={photoUrl}
                x="8.333"
                y="8.333"
                width="83.333"
                height="108.333"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
              />
            </>
          ) : (
            <circle cx="50" cy="50" r="19" className="fill-pin-open" />
          )}
        </>
      )}
    </svg>
  );
}
