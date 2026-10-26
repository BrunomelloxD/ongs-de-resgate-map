'use client';

import { Share2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { useAnnounce } from './live-region.client';
import { SHARE_TEXT } from './ui.dictionary';

export interface ShareButtonProps {
  title: string;
  text: string;
  /** Absolute, canonical URL of the page. */
  url: string;
  /** `icon`: the round button floating over a photo (C-25); the messages float below it. */
  variant?: 'button' | 'icon';
  className?: string;
}

type Outcome = 'idle' | 'copied' | 'manual';

/**
 * SHARE-01 to SHARE-03: the native share sheet when there is one; otherwise
 * copies the URL, or shows it in a field to copy by hand.
 */
export function ShareButton({
  title,
  text,
  url,
  variant = 'button',
  className,
}: ShareButtonProps) {
  const icon = variant === 'icon';
  const announce = useAnnounce();
  const [outcome, setOutcome] = useState<Outcome>('idle');
  const fieldId = useId();
  const fieldRef = useRef<HTMLInputElement>(null);

  // SHARE-03: the URL comes up selected, ready to copy by hand.
  useEffect(() => {
    if (outcome === 'manual') fieldRef.current?.focus();
  }, [outcome]);

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // The person closed the share sheet.
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setOutcome('copied');
      announce(SHARE_TEXT.copied);
    } catch {
      setOutcome('manual');
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        icon && 'relative items-end',
        className,
      )}
    >
      <button
        type="button"
        aria-label={icon ? SHARE_TEXT.label : undefined}
        onClick={() => void share()}
        className={cn(
          'touch-target inline-flex items-center justify-center gap-2 self-start rounded-full bg-surface font-semibold text-fg outline-none hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
          icon ? 'self-end shadow-card' : 'border-2 border-fg px-5',
        )}
      >
        <Share2 aria-hidden="true" className="size-5" />
        {!icon && SHARE_TEXT.label}
      </button>
      {outcome === 'copied' && (
        <p
          className={cn(
            'text-sm font-semibold text-available-fg',
            icon &&
              'absolute top-full right-0 mt-2 rounded-full bg-surface px-3 py-1.5 whitespace-nowrap shadow-card',
          )}
        >
          {SHARE_TEXT.copied}
        </p>
      )}
      {outcome === 'manual' && (
        <div
          className={cn(
            'flex flex-col gap-1',
            icon &&
              'absolute top-full right-0 mt-2 w-72 rounded-2xl bg-surface p-3 shadow-card',
          )}
        >
          <label htmlFor={fieldId} className="text-sm font-bold">
            {SHARE_TEXT.field}
          </label>
          <Input
            ref={fieldRef}
            id={fieldId}
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
