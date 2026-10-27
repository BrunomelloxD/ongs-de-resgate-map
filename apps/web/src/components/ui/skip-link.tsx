import { CONTENT_ID, NAVBAR_TEXT } from './ui.dictionary';

/**
 * Navbar note, item 5: the first Tab stop of every page, before the demo
 * banner and the navbar; it shows only while focused and jumps to `<main>`.
 */
export function SkipLink() {
  return (
    <a
      href={`#${CONTENT_ID}`}
      data-slot="skip-link"
      className="touch-target fixed top-2 left-2 z-[1300] inline-flex -translate-y-[200%] items-center rounded-full bg-brand px-5 font-bold text-on-brand shadow-card focus:translate-y-0 motion-safe:transition-transform"
    >
      {NAVBAR_TEXT.skip}
    </a>
  );
}
