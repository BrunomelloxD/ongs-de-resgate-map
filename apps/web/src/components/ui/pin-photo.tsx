import { cn } from '@/lib/utils';

/** The figcraft drop is 1.3 times taller than wide. */
export const PIN_RATIO = 1.3;

export interface PinPhotoProps {
  /**
   * Width in px; the height follows the drop's 1:1.3 ratio. Leave it out to size
   * the drop with `className` (e.g. a different size per breakpoint).
   */
  width?: number;
  /** A photo (`<img>`) that fills the drop. */
  image?: React.ReactNode;
  /** An icon centred in the round head of the drop, over `className`'s background. */
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Design System: the map pin is the system's motif, so NGO photos, uploaded
 * images and the state illustrations are cut in its shape (figcraft "foto pino").
 */
export function PinPhoto({ width, image, icon, className }: PinPhotoProps) {
  return (
    <span
      data-slot="pin-photo"
      style={
        width === undefined
          ? undefined
          : { width, height: Math.round(width * PIN_RATIO) }
      }
      className={cn(
        'mask-pin relative inline-block shrink-0 overflow-hidden',
        className,
      )}
    >
      {image && (
        <span className="absolute inset-0 [&>img]:size-full [&>img]:object-cover">
          {image}
        </span>
      )}
      {icon && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 flex aspect-square items-center justify-center"
        >
          {icon}
        </span>
      )}
    </span>
  );
}
