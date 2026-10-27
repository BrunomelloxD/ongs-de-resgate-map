import { demoDictionary } from '../demo.dictionary';
import type { DemoInfo, DemoQuotas, PhotoCredit } from '../demo.types';

const t = demoDictionary.about;
const QUOTA_KEYS = Object.keys(t.quotas) as (keyof DemoQuotas)[];
const linkClass =
  'touch-target inline-flex items-center font-semibold text-brand-text underline underline-offset-4';

export interface AboutDemoProps {
  info: DemoInfo;
  credits: readonly PhotoCredit[];
}

/** DEMO-02: explains the automatic deletion, the current quotas and the photo credits. */
export function AboutDemo({ info, credits }: AboutDemoProps) {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 text-fg"
    >
      <h1 className="text-4xl font-extrabold">{t.title}</h1>
      <p className="text-lg text-fg-secondary">
        {info.locked
          ? t.locked
          : info.enabled
            ? t.deletion(info.retentionDays)
            : t.disabled}
      </p>

      <section aria-labelledby="demo-limits" className="flex flex-col gap-4">
        <h2 id="demo-limits" className="text-2xl font-bold">
          {t.limitsTitle}
        </h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 rounded-3xl bg-surface p-6">
          <dt>{t.retention}</dt>
          <dd className="text-right font-semibold">{info.retentionDays}</dd>
          {QUOTA_KEYS.map((key) => (
            <div key={key} className="contents">
              <dt>{t.quotas[key]}</dt>
              <dd className="text-right font-semibold">{info.quotas[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="demo-credits" className="flex flex-col gap-4">
        <h2 id="demo-credits" className="text-2xl font-bold">
          {t.creditsTitle}
        </h2>
        <ul className="flex flex-col gap-4">
          {credits.map((credit) => (
            <li key={credit.page} className="flex flex-col">
              <a href={credit.page} className={linkClass}>
                {credit.title}
              </a>
              <span className="text-fg-secondary">{t.by(credit.creator)}</span>
              <a href={credit.licenseUrl} className={linkClass}>
                {t.license(credit.license)}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
