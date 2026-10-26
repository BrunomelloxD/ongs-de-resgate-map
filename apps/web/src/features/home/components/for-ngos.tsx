import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { homeDictionary as t } from '../home.dictionary';
import { HERO_PHOTOS } from './hero-art';

export const FOR_NGOS_PATHS = {
  signup: '/cadastro/sobre',
  login: '/entrar',
} as const;

/**
 * Figcraft 01 "para-ongs": the invitation for NGOs before the footer. The photo
 * is cut in a pin on the phone and is a rounded rectangle on desktop.
 */
export function ForNgos() {
  return (
    <section
      aria-labelledby="for-ngos"
      className="flex flex-col items-start gap-5 px-gutter py-14 lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-10 lg:py-28"
    >
      <span className="mask-pin block h-[124.8px] w-24 shrink-0 overflow-hidden lg:h-[360px] lg:w-[520px] lg:rounded-3xl lg:[mask-image:none]">
        {/* The phone gets the small pin crop, not the 1040px photo (PERF-04). */}
        <picture className="block size-full">
          <source
            media="(min-width: 1024px)"
            srcSet={HERO_PHOTOS.shelter.src}
          />
          <img
            src={HERO_PHOTOS.shelter.pin}
            alt=""
            width={200}
            height={260}
            loading="lazy"
            className="size-full object-cover"
          />
        </picture>
      </span>
      <div className="flex w-full flex-col gap-5 lg:w-[560px] lg:gap-7">
        <div className="flex flex-col gap-1.5">
          <h2
            id="for-ngos"
            className="font-heading text-[1.75rem] leading-[2.125rem] font-extrabold tracking-tight lg:text-4xl lg:leading-[2.625rem]"
          >
            {t.forNgos.title}
          </h2>
          <p className="text-fg-secondary">
            {t.forNgos.text}
            <span className="hidden lg:inline"> {t.forNgos.more}</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center">
          <Link
            href={FOR_NGOS_PATHS.signup}
            className={cn(
              buttonVariants({ variant: 'secondary' }),
              'w-full lg:w-auto',
            )}
          >
            {t.forNgos.signup}
          </Link>
          <Link
            href={FOR_NGOS_PATHS.login}
            className="touch-target inline-flex items-center px-1 font-bold text-brand-text underline underline-offset-4"
          >
            {t.forNgos.login}
          </Link>
        </div>
      </div>
    </section>
  );
}
