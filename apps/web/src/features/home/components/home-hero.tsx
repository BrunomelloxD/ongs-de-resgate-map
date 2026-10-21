import Link from 'next/link';
import { Heart, Lock, MapPin, MessageCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle.client';
import { homeDictionary as t } from '../home.dictionary';

export const LOCATION_PATH = '/localizacao';
export const LOGIN_PATH = '/entrar';

const STEP_ICONS = [MapPin, Heart, MessageCircle] as const;

/**
 * Welcome page (HOME-01). Plain links only: the browser location is asked
 * for on /localizacao, never here (HOME-02).
 */
export function HomeHero() {
  return (
    <div className="flex flex-1 flex-col bg-page text-fg">
      <header className="flex items-center justify-between gap-4 px-gutter py-3">
        <span className="flex items-center gap-2 font-heading text-lg font-bold">
          <MapPin aria-hidden="true" className="size-5 text-brand-text" />
          {t.brand}
        </span>
        <nav className="flex items-center gap-2">
          <Link
            href={LOGIN_PATH}
            className="touch-target inline-flex items-center rounded-full border border-line px-4 text-sm font-semibold"
          >
            {t.ngoLink}
          </Link>
          <ThemeToggle labels={t.theme} />
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col gap-6 px-gutter py-12 md:py-20">
          <h1 className="max-w-xl text-5xl font-extrabold tracking-tight md:text-7xl">
            {t.title}
          </h1>
          <p className="max-w-lg text-lg text-fg-secondary">{t.lead}</p>
          <div>
            <Link
              href={LOCATION_PATH}
              className="touch-target inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-on-brand"
            >
              <MapPin aria-hidden="true" className="size-5" />
              {t.cta}
            </Link>
          </div>
          <p className="flex items-start gap-2 text-sm text-fg-muted">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t.privacy}
          </p>
        </section>

        <section
          aria-labelledby="how-it-works"
          className="flex flex-col gap-8 bg-subtle px-gutter py-12 md:flex-row md:py-16"
        >
          <div className="flex flex-col gap-1 md:w-1/4">
            <h2 id="how-it-works" className="text-3xl font-bold">
              {t.howItWorks.title}
            </h2>
            <p className="text-fg-secondary">{t.howItWorks.subtitle}</p>
          </div>
          <ol className="grid flex-1 gap-6 md:grid-cols-3">
            {t.howItWorks.steps.map((step, index) => {
              const Icon = STEP_ICONS[index]!;
              return (
                <li key={step.title} className="flex gap-4 md:flex-col">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-deep text-on-brand-deep">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <p className="text-fg-secondary">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
