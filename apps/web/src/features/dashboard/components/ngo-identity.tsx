import { PawPrint } from 'lucide-react';
import { PinPhoto } from '@/components/ui/pin-photo';
import { cn } from '@/lib/utils';

export interface NgoIdentityProps {
  name: string;
  /** Shown under the name in the sidebar; the phone header shows "Área da ONG". */
  detail: string;
  imageUrl: string | null;
  /** `sidebar`: white text on verde-mata escuro; `header`: the page's colours. */
  tone: 'sidebar' | 'header';
  className?: string;
}

/** Figcraft "ong" / "topo" (09-*): the NGO avatar cut in a pin, its name and a detail line. */
export function NgoIdentity({
  name,
  detail,
  imageUrl,
  tone,
  className,
}: NgoIdentityProps) {
  const sidebar = tone === 'sidebar';
  const width = sidebar ? 40 : 32;

  return (
    <div
      data-slot="ngo-identity"
      className={cn('flex min-w-0 items-center gap-3', className)}
    >
      <PinPhoto
        width={width}
        image={
          imageUrl ? (
            // The api serves a small WebP (PERF-02). Decorative: the name follows.
            <img
              src={imageUrl}
              alt=""
              width={width}
              height={Math.round(width * 1.3)}
            />
          ) : undefined
        }
        icon={imageUrl ? undefined : <PawPrint className="size-4" />}
        className="bg-surface-2 text-fg-muted"
      />
      <div className="flex min-w-0 flex-col">
        <p
          className={cn(
            'truncate font-bold',
            sidebar ? 'text-base text-on-brand-deep' : 'text-lg text-fg',
          )}
        >
          {name}
        </p>
        <p
          className={cn(
            'truncate',
            sidebar
              ? 'text-sm text-on-brand-deep-soft'
              : 'text-xs font-semibold text-fg-secondary',
          )}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}
