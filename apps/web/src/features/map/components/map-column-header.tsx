import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { SITE_PATHS, SITE_TEXT } from '@/components/ui/ui.dictionary';

/** Figcraft 03-mapa-* (desktop): the list column opens with the logo and "Sou uma ONG" (M-02). */
export function MapColumnHeader() {
  return (
    <div
      data-slot="map-column-header"
      className="flex items-center justify-between gap-4"
    >
      <Link
        href={SITE_PATHS.home}
        className="touch-target inline-flex items-center"
      >
        <Logo />
      </Link>
      <Link
        href={SITE_PATHS.ngo}
        className="touch-target inline-flex items-center px-1 font-bold text-brand-text underline underline-offset-4"
      >
        {SITE_TEXT.ngo}
      </Link>
    </div>
  );
}
