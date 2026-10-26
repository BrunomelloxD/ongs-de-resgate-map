import { ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuardedLink } from './unsaved-changes.client';

export interface AppBarProps {
  title: string;
  /** Where ← (or ✕) goes; the label names the link and shows on desktop. */
  back: { href: string; label: string };
  /** `close` draws ✕ on the phone, like "✕ Cadastrar animal". */
  icon?: 'back' | 'close';
  /**
   * `h1`: the bar's title is the page heading (big on desktop). `p`: the page
   * has its own h1; the bar's title shows only on the phone.
   */
  titleAs?: 'h1' | 'p';
  /** Pages whose desktop has another header (e.g. /localizacao). */
  phoneOnly?: boolean;
  className?: string;
}

/**
 * Figcraft "appbar" (C-12): on the phone ← or ✕ and the title in one 60px row;
 * on desktop the text link above the big title. The link asks before leaving a
 * form with changes (DIRTY-01).
 */
export function AppBar({
  title,
  back,
  icon = 'back',
  titleAs: Title = 'h1',
  phoneOnly = false,
  className,
}: AppBarProps) {
  return (
    <div
      data-slot="app-bar"
      className={cn(
        '-ml-2.5 flex min-h-11 items-center gap-1 lg:ml-0 lg:flex-col lg:items-start lg:gap-2',
        phoneOnly && 'lg:hidden',
        className,
      )}
    >
      <GuardedLink
        href={back.href}
        className="touch-target inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-fg lg:font-semibold lg:text-brand-text lg:underline"
      >
        {icon === 'close' ? (
          <>
            <X aria-hidden="true" className="size-6 lg:hidden" />
            <ArrowLeft aria-hidden="true" className="hidden size-5 lg:block" />
          </>
        ) : (
          <ArrowLeft aria-hidden="true" className="size-6 lg:size-5" />
        )}
        <span className="sr-only lg:not-sr-only">{back.label}</span>
      </GuardedLink>
      <Title
        className={cn(
          'min-w-0 truncate font-heading text-lg font-bold text-fg',
          Title === 'h1'
            ? 'lg:text-4xl lg:font-extrabold lg:whitespace-normal'
            : 'lg:hidden',
        )}
      >
        {title}
      </Title>
    </div>
  );
}
