import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';
import type { AxeResults } from 'axe-core';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/** A11Y-12: the violations with impact "serious" or "critical" on the current page. */
export async function seriousAxeViolations(page: Page) {
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
