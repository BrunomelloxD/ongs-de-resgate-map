import localFont from 'next/font/local';

// Variable woff2 files kept in the repo: the build downloads nothing (D-07).
export const bricolage = localFont({
  src: './fonts/bricolage-grotesque-latin-wght-normal.woff2',
  variable: '--font-bricolage',
  weight: '200 800',
  display: 'swap',
});

export const figtree = localFont({
  src: './fonts/figtree-latin-wght-normal.woff2',
  variable: '--font-figtree',
  weight: '300 900',
  display: 'swap',
});
