import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { LiveRegion } from '@/components/ui/live-region.client';
import { DemoBannerContainer } from '@/features/demo';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { bricolage, figtree } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Animal Helper', template: '%s | Animal Helper' },
};

// A11Y-10: never maximumScale nor userScalable: false.
// viewportFit lets the safe-area-inset padding in globals.css work on notched phones.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// No cookies() here: it would make the whole app dynamic (AD-001), and visitors get no cookie (SEC-03).
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      className={`h-full antialiased ${figtree.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Constant script, no user data. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LiveRegion>
          <Suspense fallback={null}>
            <DemoBannerContainer />
          </Suspense>
          {children}
        </LiveRegion>
      </body>
    </html>
  );
}
