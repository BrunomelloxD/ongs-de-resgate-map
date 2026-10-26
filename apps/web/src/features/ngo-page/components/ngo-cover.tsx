import { PawPrint } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link.client';
import {
  ShareButton,
  type ShareButtonProps,
} from '@/components/ui/share-button.client';
import { ngoPageDictionary } from '../ngo-page.dictionary';
import type { NgoPublic } from '../ngo-page.types';

const t = ngoPageDictionary.profile;

export interface NgoCoverProps {
  ngo: Pick<NgoPublic, 'imageUrl'>;
  /** SHARE-01: title, text and canonical URL of the page. */
  share?: Pick<ShareButtonProps, 'title' | 'text' | 'url'>;
  /** Where ← goes when the visitor didn't come from this site. */
  backHref: string;
}

/**
 * Figcraft 04 (O-01, C-25): the NGO's photo across the page, 220 px tall on
 * the phone and 320 px on desktop, with ← (phone) and the round "Compartilhar"
 * floating on it. SPEC_DEVIATION: the figcraft hides "Compartilhar" on desktop;
 * it stays there so SHARE-02 (copy the link) still works without Web Share.
 */
export function NgoCover({ ngo, share, backHref }: NgoCoverProps) {
  return (
    <div
      data-slot="ngo-cover"
      className="relative h-[220px] w-full bg-surface-2 lg:h-80"
    >
      {ngo.imageUrl ? (
        // The page's LCP: the api's 600 px WebP, never lazy (PERF-04).
        // Decorative: the NGO's name is the h1 right below.
        <img
          src={ngo.imageUrl}
          alt=""
          width={600}
          height={600}
          fetchPriority="high"
          className="size-full object-cover"
        />
      ) : (
        <div
          data-slot="ngo-cover-placeholder"
          aria-hidden="true"
          className="flex size-full items-center justify-center text-fg-muted"
        >
          <PawPrint className="size-16" />
        </div>
      )}
      <BackLink
        href={backHref}
        label={t.back}
        className="absolute top-4 left-4 lg:hidden"
      />
      {share && (
        <ShareButton
          {...share}
          variant="icon"
          className="absolute top-4 right-4 lg:right-[max(var(--page-gutter),calc((100%-75rem)/2))]"
        />
      )}
    </div>
  );
}
