import { Navigation, PawPrint } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
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

/** O-03: today's closing time next to the badge, while the NGO is open. */
function closesText(ngo: NgoPublic): string | null {
  const today = ngo.weekHours.find((day) => day.dayOfWeek === ngo.todayIndex);
  return ngo.openNow && today?.closesAt ? t.closesAt(today.closesAt) : null;
}

/**
 * NGO-01: image, name, badge, description, WhatsApp, address, map, directions
 * and the week. Figcraft 04 (O-02, O-04): two blocks the page places on its
 * grid (`display: contents`): the summary, under the cover with the image in a
 * pin over it, and the address with the week; the animals go between them on
 * the phone and in the right column on desktop.
 */
export function NgoProfile({ ngo, miniMap, className }: NgoProfileProps) {
  const week = WEEK_ORDER.map((dayOfWeek) =>
    ngo.weekHours.find((day) => day.dayOfWeek === dayOfWeek),
  ).filter((day) => day !== undefined);
  const closes = closesText(ngo);

  return (
    <section data-slot="ngo-profile" className="contents text-fg">
      <div
        data-slot="ngo-summary"
        className={cn(
          'order-1 flex flex-col items-start gap-3 text-fg lg:col-start-1 lg:row-start-1',
          className,
        )}
      >
        {/* Page-coloured ring around the pin, over the cover. */}
        <span className="mask-pin relative -mt-[68px] block h-[109px] w-[84px] shrink-0 bg-page lg:-mt-25 lg:h-[172px] lg:w-[132px]">
          {ngo.imageUrl ? (
            <span className="mask-pin absolute inset-[4.5%] overflow-hidden">
              {/* The api already serves a 600 px WebP (PERF-02); next/image would re-encode it.
                  Decorative: the name comes right after. */}
              <img
                src={ngo.imageUrl}
                alt=""
                width={NGO_IMAGE_SIZE_PX}
                height={NGO_IMAGE_SIZE_PX}
                className="size-full object-cover"
              />
            </span>
          ) : (
            <span
              data-slot="ngo-image-placeholder"
              aria-hidden="true"
              className="mask-pin absolute inset-[4.5%] flex items-start justify-center bg-surface-2 pt-[22%] text-fg-muted"
            >
              <PawPrint className="size-8 lg:size-12" />
            </span>
          )}
        </span>
        <h1 className="font-heading text-[2rem] leading-10 font-extrabold tracking-tight lg:text-5xl lg:leading-[3.375rem]">
          {ngo.name}
        </h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-fg-secondary">
          <StatusBadge variant={ngo.openNow ? 'open' : 'closed'} />
          {closes}
        </p>
        <p className="text-base whitespace-pre-line">{ngo.description}</p>
        <a
          href={ngo.whatsappUrl}
          className={cn(buttonVariants({ variant: 'whatsapp' }), 'w-full')}
        >
          <WhatsAppIcon className="size-6" />
          {t.whatsapp}
        </a>
      </div>

      <div
        data-slot="ngo-details"
        className={cn(
          'order-3 flex flex-col gap-8 text-fg lg:col-start-1 lg:row-start-2',
          className,
        )}
      >
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-2xl font-extrabold lg:text-lg lg:font-bold">
            {t.address}
          </h2>
          <p>{addressText(ngo)}</p>
          {miniMap && (
            <div className="h-44 overflow-hidden rounded-3xl lg:h-50">
              {miniMap}
            </div>
          )}
          <a
            href={directionsUrl(ngo.lat, ngo.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
          >
            <Navigation aria-hidden="true" className="size-5" />
            {t.directions}
            <span className="sr-only"> {t.newTab}</span>
          </a>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-2xl font-extrabold lg:text-lg lg:font-bold">
            {t.hours}
          </h2>
          <ul className="flex flex-col">
            {week.map((day) => {
              const isToday = day.dayOfWeek === ngo.todayIndex;
              return (
                <li
                  key={day.dayOfWeek}
                  aria-current={isToday ? 'date' : undefined}
                  className={cn(
                    'flex justify-between rounded-xl px-3.5 py-2.5',
                    isToday && 'bg-subtle font-bold',
                  )}
                >
                  <span>
                    {t.days[day.dayOfWeek]}
                    {isToday && ` · ${t.today}`}
                  </span>
                  <span
                    className={cn(
                      'font-semibold',
                      day.closed && 'text-error-fg',
                    )}
                  >
                    {hoursText(day)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
