import { Heart, MapPin } from 'lucide-react';
import { PinPhoto } from '@/components/ui/pin-photo';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { cn } from '@/lib/utils';
import { homeDictionary as t } from '../home.dictionary';

const STEP_ICONS = [
  <MapPin key="map" />,
  <Heart key="heart" />,
  <WhatsAppIcon key="whatsapp" />,
] as const;

// The dotted "trajeto" between the pins: 3px dots every 9px (figcraft dashes 2/7, round caps).
const DOTS =
  'bg-[radial-gradient(circle,var(--color-brand-deep)_1.5px,transparent_2px)] dark:bg-[radial-gradient(circle,var(--color-brand)_1.5px,transparent_2px)]';

/**
 * Figcraft 01 "como-funciona" (HOME-01): the three steps with their icons in
 * verde-mata pins, linked by a dotted line (down on the phone, across on desktop).
 */
export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="how-it-works"
      className="flex flex-col gap-7 bg-subtle px-gutter py-14 lg:flex-row lg:gap-10 lg:py-28"
    >
      <div className="flex flex-col gap-1.5 lg:w-80 lg:shrink-0">
        <h2
          id="how-it-works"
          className="font-heading text-[1.75rem] leading-8 font-extrabold tracking-tight lg:text-4xl lg:leading-[2.625rem]"
        >
          {t.howItWorks.title}
        </h2>
        <p className="text-fg-secondary">{t.howItWorks.subtitle}</p>
      </div>
      <ol className="flex flex-1 flex-col lg:grid lg:grid-cols-3 lg:gap-5">
        {t.howItWorks.steps.map((step, index) => {
          const last = index === t.howItWorks.steps.length - 1;
          return (
            <li
              key={step.title}
              data-slot="how-it-works-step"
              className="flex gap-4 lg:flex-col lg:gap-2.5"
            >
              <div className="flex shrink-0 flex-col items-center gap-1.5 lg:flex-row lg:gap-3">
                <PinPhoto
                  width={40}
                  icon={STEP_ICONS[index]}
                  className="bg-brand-deep text-brand [&_svg]:size-5"
                />
                {!last && (
                  <span
                    data-slot="how-it-works-path"
                    aria-hidden="true"
                    className={cn(
                      DOTS,
                      'h-[46px] w-1 bg-[length:4px_9px] bg-repeat-y lg:mr-3 lg:h-1 lg:w-auto lg:flex-1 lg:bg-[length:9px_4px] lg:bg-repeat-x',
                    )}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1 pt-2.5 pb-4 lg:gap-2.5 lg:p-0">
                <h3 className="text-lg leading-6 font-bold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-fg-secondary">{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
