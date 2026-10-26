import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mapDictionary as t } from '../map.dictionary';

export interface LocationErrorPanelProps {
  /** "Tentar de novo" (LOC-03). */
  onRetry: () => void;
  /** The "Cidade ou CEP" field with "Buscar pela cidade ou CEP" (MAP-15). */
  search: React.ReactNode;
}

/**
 * MAP-15, figcraft 03-mapa-erro-*: the ⓘ in a light-red circle, the title,
 * the text, "Tentar de novo" and the search by city or CEP (M-15).
 */
export function LocationErrorPanel({
  onRetry,
  search,
}: LocationErrorPanelProps) {
  return (
    <div data-slot="location-error" className="flex flex-col gap-4">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-error-soft text-error-fg"
      >
        <CircleAlert className="size-6" />
      </span>
      <h2 className="font-heading text-[1.75rem] leading-8 font-extrabold lg:text-2xl">
        {t.locationError.title}
      </h2>
      <p className="text-fg-secondary">{t.locationError.text}</p>
      <Button type="button" onClick={onRetry}>
        {t.locationError.retry}
      </Button>
      {search}
    </div>
  );
}
