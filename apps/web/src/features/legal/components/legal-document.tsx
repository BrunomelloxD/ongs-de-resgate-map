import { legalDictionary, type LegalText } from '../legal.dictionary';

export interface LegalDocumentProps {
  text: LegalText;
  /** `TERMS_VERSION`, the same one saved with the NGO's acceptance. */
  version: string;
}

export function LegalDocument({ text, version }: LegalDocumentProps) {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 text-fg"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold">{text.title}</h1>
        <p className="text-sm text-fg-secondary">
          {legalDictionary.version(version)}
        </p>
      </header>
      <p className="text-lg text-fg-secondary">{text.intro}</p>
      {text.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
