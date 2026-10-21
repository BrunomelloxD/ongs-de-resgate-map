import { MessageCircle, Navigation, PawPrint } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { maskCep } from '@/lib/masks';
import { cn } from '@/lib/utils';
import { ngoPageDictionary } from '../ngo-page.dictionary';
import type { DayHours, NgoPublic } from '../ngo-page.types';

const t = ngoPageDictionary.profile;

export const NGO_IMAGE_SIZE_PX = 120;
// Monday first, as in the design; dayOfWeek 0 is Sunday.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** NGO-04: universal link that opens the maps app on any platform. */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function hoursText(day: DayHours): string {
  return day.closed || !day.opensAt || !day.closesAt
    ? t.closed
    : t.dayHours(day.opensAt, day.closesAt);
}

function addressText({ address }: NgoPublic): string {
  const street = [address.street, address.number, address.complement]
    .filter(Boolean)
    .join(', ');
  return `${street} · ${address.district}, ${address.city} – ${address.uf} · ${maskCep(address.cep)}`;
}

export interface NgoProfileProps {
  ngo: NgoPublic;
  /** The mini map, loaded on demand by the page (PERF-01). */
  miniMap?: React.ReactNode;
  className?: string;
}

/** NGO-01: image, name, badge, description, WhatsApp, address, map, directions and the week. */
export function NgoProfile({ ngo, miniMap, className }: NgoProfileProps) {
  const linkClass =
    'touch-target inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold';
  const week = WEEK_ORDER.map((dayOfWeek) =>
    ngo.weekHours.find((day) => day.dayOfWeek === dayOfWeek),
  ).filter((day) => day !== undefined);

  return (
    <section
      data-slot="ngo-profile"
      className={cn('flex flex-col gap-6 text-fg', className)}
    >
      <div className="flex flex-col items-start gap-3">
        {ngo.imageUrl ? (
          // The api already serves a 600 px WebP (PERF-02); next/image would re-encode it.
          // Decorative: the name comes right after.
          <img
            src={ngo.imageUrl}
            alt=""
            width={NGO_IMAGE_SIZE_PX}
            height={NGO_IMAGE_SIZE_PX}
            className="size-30 rounded-full object-cover shadow-card"
          />
        ) : (
          <div
            data-slot="ngo-image-placeholder"
            aria-hidden="true"
            className="flex size-30 items-center justify-center rounded-full bg-surface-2"
          >
            <PawPrint className="size-12 text-fg-muted" />
          </div>
        )}
        <h1 className="font-heading text-4xl font-extrabold">{ngo.name}</h1>
        <StatusBadge variant={ngo.openNow ? 'open' : 'closed'} />
        <p className="text-base whitespace-pre-line text-fg-secondary">
          {ngo.description}
        </p>
        <a
          href={ngo.whatsappUrl}
          className={cn(linkClass, 'w-full bg-brand-deep text-on-brand-deep')}
        >
          <MessageCircle aria-hidden="true" className="size-5" />
          {t.whatsapp}
        </a>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold">{t.address}</h2>
        <p className="text-fg-secondary">{addressText(ngo)}</p>
        {miniMap && (
          <div className="h-52 overflow-hidden rounded-3xl">{miniMap}</div>
        )}
        <a
          href={directionsUrl(ngo.lat, ngo.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(linkClass, 'w-full border-2 border-fg bg-surface')}
        >
          <Navigation aria-hidden="true" className="size-5" />
          {t.directions}
          <span className="sr-only"> {t.newTab}</span>
        </a>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold">{t.hours}</h2>
        <ul className="flex flex-col">
          {week.map((day) => {
            const isToday = day.dayOfWeek === ngo.todayIndex;
            return (
              <li
                key={day.dayOfWeek}
                aria-current={isToday ? 'date' : undefined}
                className={cn(
                  'flex justify-between rounded-xl px-3 py-2.5',
                  isToday && 'bg-surface-2 font-bold',
                )}
              >
                <span>
                  {t.days[day.dayOfWeek]}
                  {isToday && ` · ${t.today}`}
                </span>
                <span
                  className={cn('font-semibold', day.closed && 'text-error-fg')}
                >
                  {hoursText(day)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
