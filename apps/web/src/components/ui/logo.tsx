import { cn } from '@/lib/utils';
import { DROP_PATH } from './pin';
import { BRAND_NAME } from './ui.dictionary';

export interface LogoProps {
  /** `light`: yellow pin and white text, on the verde-mata panels. */
  variant?: 'default' | 'light';
  className?: string;
}

/** Design System "Logo/Wordmark": the filled pin with its dot and "Animal Helper". */
export function Logo({ variant = 'default', className }: LogoProps) {
  const light = variant === 'light';

  return (
    <span
      data-slot="logo"
      data-variant={variant}
      className={cn(
        'inline-flex items-center gap-2 font-heading text-lg leading-6 font-bold',
        light ? 'text-white' : 'text-fg',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        width="22"
        height="29"
        viewBox="0 0 100 130"
        className="shrink-0"
      >
        <path
          d={DROP_PATH}
          className={light ? 'fill-brand' : 'fill-pin-open dark:fill-brand'}
        />
        <circle
          cx="50"
          cy="50"
          r="20"
          className={light ? 'fill-pin-open' : 'fill-brand dark:fill-pin-open'}
        />
      </svg>
      {BRAND_NAME}
    </span>
  );
}
