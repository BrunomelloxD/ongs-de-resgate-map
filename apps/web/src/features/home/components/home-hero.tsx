import Link from 'next/link';
import { Lock, MapPin } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { homeDictionary as t } from '../home.dictionary';
import { ForNgos } from './for-ngos';
import { HeroArt } from './hero-art';
import { HowItWorks } from './how-it-works';

export const LOCATION_PATH = '/localizacao';

/**
 * Welcome page (HOME-01), figcraft 01: the hero with the photos, "Como
 * funciona" and the block for NGOs. Plain links only: the browser location is
 * asked for on /localizacao, never here (HOME-02).
 */
export function HomeHero({
  notice,
}: {
  /** Shown above the title, like the "Conta excluída." of PROF-08. */
  notice?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-page text-fg">
      <main id="conteudo" className="flex flex-1 flex-col">
        {/* Two columns from 1280px; below that the photos sit above the text. */}
        <section
          aria-labelledby="home-title"
          className="xl:h-[700px] xl:px-gutter"
        >
          <div className="relative xl:h-full">
            <HeroArt />
            <div className="relative px-gutter pt-2 pb-14 xl:px-0 xl:pt-[150px] xl:pb-0">
              <div className="flex max-w-[600px] flex-col items-start gap-5 xl:gap-7">
                {notice}
                <h1
                  id="home-title"
                  className="font-heading text-[2.75rem] leading-[2.875rem] font-extrabold tracking-[-0.03em] xl:text-7xl xl:leading-[4.5rem] min-[90rem]:text-8xl min-[90rem]:leading-[5.75rem] xl:tracking-[-0.035em]"
                >
                  {t.title}
                </h1>
                <p className="max-w-[520px] text-lg leading-7">{t.lead}</p>
                <Link
                  href={LOCATION_PATH}
                  className={cn(buttonVariants(), 'w-full xl:w-auto')}
                >
                  <MapPin aria-hidden="true" className="size-6" />
                  {t.cta}
                </Link>
                <p className="flex items-start gap-2 text-sm text-fg-secondary">
                  <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t.privacy}
                </p>
              </div>
            </div>
          </div>
        </section>
        <HowItWorks />
        <ForNgos />
      </main>
    </div>
  );
}
