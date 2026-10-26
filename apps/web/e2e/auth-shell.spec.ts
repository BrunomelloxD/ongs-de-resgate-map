import { expect, test, type Page } from '@playwright/test';
import { seriousAxeViolations } from './axe';
import { hasHorizontalScroll, usableWidth } from './support/layout';

// T172 (PERF-08, C-09): from 1024 px the login, the recovery and the signup have
// the green panel of the figcraft on the left and the form on the right.
const MIN_USABLE_PX = 320;
const ROUTES = ['/entrar', '/recuperar-senha', '/cadastro/sobre'] as const;

const panel = (page: Page) => page.locator('[data-slot="auth-shell-panel"]');

test.describe('em 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const route of ROUTES) {
    test(`${route}: painel à esquerda, com a foto, e o formulário à direita`, async ({
      page,
    }) => {
      await page.goto(route);
      const aside = panel(page);
      const form = page.locator('main form');
      await expect(aside).toBeVisible();
      await expect(form).toBeVisible();

      const asideBox = (await aside.boundingBox())!;
      const formBox = (await form.boundingBox())!;
      expect(asideBox.x).toBe(0);
      expect(formBox.x).toBeGreaterThanOrEqual(asideBox.x + asideBox.width);
      expect(await usableWidth(form)).toBeGreaterThanOrEqual(MIN_USABLE_PX);

      // The photo of public/ really loads (PERF-02: WebP, with its size declared).
      const photo = aside.locator('img');
      await expect(photo).toHaveAttribute('src', /\.webp$/);
      await expect
        .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      expect(await seriousAxeViolations(page)).toEqual([]);
    });
  }
});

test.describe('em 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    test(`${route}: sem painel e sem rolagem horizontal`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('main form')).toBeVisible();

      await expect(panel(page)).toBeHidden();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }
});
