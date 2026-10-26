import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BRAND_NAME, SITE_PATHS, SITE_TEXT } from './ui.dictionary';

export interface SiteFooterProps {
  /** E.g. the theme toggle, which the public header no longer carries. */
  extra?: React.ReactNode;
  className?: string;
}

const LINKS = [
  [SITE_TEXT.forNgos, SITE_PATHS.ngo],
  [SITE_TEXT.privacy, SITE_PATHS.privacy],
  [SITE_TEXT.terms, SITE_PATHS.terms],
  [SITE_TEXT.credits, SITE_PATHS.credits],
] as const;

/**
 * Figcraft "footer" (01, 04, 05): verde-mata escuro, the big wordmark, the
 * links and the photo credits; "Créditos das fotos" opens /sobre-a-demo.
 */
export function SiteFooter({ extra, className }: SiteFooterProps) {
  return (
    <footer
      data-slot="site-footer"
      className={cn(
        'grid gap-4 bg-brand-deep-pressed px-gutter py-12 text-white lg:grid-cols-[1fr_auto] lg:gap-x-6 lg:gap-y-6 lg:py-18',
        className,
      )}
    >
      <p className="font-heading text-[2.75rem] leading-[2.875rem] font-extrabold tracking-tight lg:col-start-1 lg:row-start-1 lg:text-8xl lg:leading-[5.75rem]">
        {BRAND_NAME}
      </p>
      <p className="text-on-brand-deep-soft lg:col-span-2 lg:row-start-2">
        {SITE_TEXT.description}
      </p>
      <nav
        aria-label={SITE_TEXT.footerNav}
        className="lg:col-start-2 lg:row-start-1 lg:self-end"
      >
        <ul className="flex flex-wrap gap-x-5 lg:gap-x-7">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <Link
                href={href}
                className="touch-target inline-flex items-center px-1 font-bold underline underline-offset-4"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="text-sm text-on-brand-deep-soft lg:col-span-2 lg:row-start-3">
        {SITE_TEXT.photoCredits}
      </p>
      {extra && <div className="lg:col-span-2">{extra}</div>}
    </footer>
  );
}
