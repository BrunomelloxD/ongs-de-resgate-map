import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { SITE_PATHS, SITE_TEXT } from './ui.dictionary';

export interface SiteHeaderProps {
  /** Pages whose phone layout has its own top bar (location, NGO, animal). */
  desktopOnly?: boolean;
  className?: string;
}

const NAV_LINK =
  'touch-target hidden items-center px-1 font-bold text-fg lg:inline-flex';

/**
 * Figcraft "nav" (01, 02, 04, 05): logo, "Como funciona", "Mapa de ONGs" and
 * "Sou uma ONG" in outline on desktop; logo and the underlined "Sou uma ONG" on
 * the phone. Every link keeps a 44px target (A11Y-02).
 */
export function SiteHeader({
  desktopOnly = false,
  className,
}: SiteHeaderProps) {
  return (
    <header
      data-slot="site-header"
      className={cn(
        'flex items-center gap-6 bg-page px-gutter py-2 lg:min-h-20',
        desktopOnly && 'max-lg:hidden',
        className,
      )}
    >
      <Link
        href={SITE_PATHS.home}
        className="touch-target inline-flex items-center"
      >
        <Logo />
      </Link>
      <nav
        aria-label={SITE_TEXT.nav}
        className="ml-auto flex items-center gap-6"
      >
        <Link href={SITE_PATHS.howItWorks} className={NAV_LINK}>
          {SITE_TEXT.howItWorks}
        </Link>
        <Link href={SITE_PATHS.map} className={NAV_LINK}>
          {SITE_TEXT.map}
        </Link>
        <Link
          href={SITE_PATHS.ngo}
          className="touch-target inline-flex items-center px-1 font-bold text-brand-text underline underline-offset-4 lg:rounded-full lg:border-[1.5px] lg:border-fg lg:px-[1.125rem] lg:text-sm lg:text-fg lg:no-underline lg:hover:bg-subtle"
        >
          {SITE_TEXT.ngo}
        </Link>
      </nav>
    </header>
  );
}
