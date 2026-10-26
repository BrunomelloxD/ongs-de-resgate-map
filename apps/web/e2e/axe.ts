import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';
import type { AxeResults } from 'axe-core';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/**
 * Waits for the end state the visitor sees: the streamed `<title>` of a client
 * navigation and the finite CSS transitions (a button mid-fade fails contrast).
 * Nothing is skipped: a page that never gets a title still fails `document-title`.
 */
async function settled(page: Page) {
  await page
    .waitForFunction(() => document.title !== '', null, { timeout: 5_000 })
    .catch(() => undefined);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

/** A11Y-12: the violations with impact "serious" or "critical" on the current page. */
export async function seriousAxeViolations(page: Page) {
  await settled(page);
  await page.addScriptTag({ path: axePath });
  const results = await page.evaluate(() =>
    (
      window as unknown as { axe: { run: () => Promise<AxeResults> } }
    ).axe.run(),
  );

  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
}
