import type { Locator, Page } from '@playwright/test';

/** Width left for content: the box minus its horizontal padding. */
export function usableWidth(locator: Locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return (
      el.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)
    );
  });
}

export function hasHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}

const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, [role="switch"], [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])';

/**
 * A11Y-02: visible controls under 44×44 px. Out of the count, as WCAG 2.5.8
 * allows: links inside a sentence. The map pins count too (44×44 focus box, T173).
 * A visually hidden input counts through its label.
 */
export function smallTargets(page: Page, min = 44) {
  return page.evaluate(
    ({ selector, min }) => {
      const describe = (el: Element) =>
        `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}"`;
      const failures: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        if (el.closest('[hidden], [inert]')) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || !el.checkVisibility()) continue;
        let box = el.getBoundingClientRect();
        // sr-only inputs: the label is what people tap.
        if (box.width <= 1 || box.height <= 1) {
          const label = (el as HTMLInputElement).labels?.[0];
          if (!label) continue;
          box = label.getBoundingClientRect();
        }
        // Inline links in running text (WCAG 2.5.8 inline exception).
        if (el.tagName === 'A' && style.display === 'inline') continue;
        // A checkbox beside its label: the label is a target too.
        const label = (el as HTMLInputElement).labels?.[0];
        if (label && label.getBoundingClientRect().height >= min) continue;
        if (box.width < min - 0.5 || box.height < min - 0.5)
          failures.push(
            `${describe(el)} ${Math.round(box.width)}×${Math.round(box.height)}`,
          );
      }
      return failures;
    },
    { selector: INTERACTIVE, min },
  );
}

/** A11Y-07: visible buttons and links with only an icon and no aria-label. */
export function unlabeledIconControls(page: Page) {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'button, a[href], [role="button"]',
      ),
    ]
      .filter((el) => el.checkVisibility())
      .filter((el) => (el.textContent ?? '').trim() === '')
      .filter(
        (el) =>
          !el.getAttribute('aria-label')?.trim() &&
          !el.getAttribute('aria-labelledby') &&
          !el.title.trim() &&
          // The name may come from the content (a labelled icon or image).
          !el.querySelector(
            '[aria-label]:not([aria-label=""]), img[alt]:not([alt=""])',
          ),
      )
      .map((el) => el.outerHTML.slice(0, 120)),
  );
}

const ANIMAL_ALT = /^.+, (cão|gato|outro), porte (pequeno|médio|grande)$/;

/** A11Y-11: the animal photos whose alt isn't "{nome}, {espécie}, porte {porte}". */
export function badAnimalAlts(page: Page) {
  return page
    .locator(
      '[data-slot="animal-detail"] img:not([alt=""]), [data-slot="animal-card"] img, [data-slot="animal-row"] img',
    )
    .evaluateAll(
      (imgs, pattern) =>
        imgs
          .map((img) => img.getAttribute('alt') ?? '')
          .filter((alt) => !new RegExp(pattern).test(alt)),
      ANIMAL_ALT.source,
    );
}
