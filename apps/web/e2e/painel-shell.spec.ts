import { expect, test, type Page } from '@playwright/test';
import { dashboardDictionary as t } from '../src/features/dashboard/dashboard.dictionary';
import { seriousAxeViolations } from './axe';
import { LoginPage } from './pages/auth.page';
import { createNgo, deleteNgo, newTestIp, type TestNgo } from './support/stack';

// T184 (PERF-08, C-11, C-12): the NGO area shell of the figcraft.
test.use({ extraHTTPHeaders: { 'x-forwarded-for': newTestIp() } });

let ngo: TestNgo & { legalName: string };

test.beforeAll(async () => {
  ngo = await createNgo(newTestIp(), 'e2e-web-shell');
});

test.afterAll(async () => {
  await deleteNgo(ngo);
});

async function login(page: Page) {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(ngo.email, ngo.password);
  await page.waitForURL('**/painel');
}

const sidebar = (page: Page) => page.locator('[data-slot="dashboard-sidebar"]');

test.describe('em 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const [path, current] of [
    ['/painel', t.header.animals],
    ['/painel/animais/novo', t.header.animals],
    ['/painel/perfil', t.header.profile],
  ] as const) {
    test(`${path}: barra lateral de 300 px com "${current}" destacado`, async ({
      page,
    }) => {
      await login(page);
      await page.goto(path);
      const aside = sidebar(page);
      await expect(aside).toBeVisible();
      expect((await aside.boundingBox())!.width).toBe(300);
      await expect(aside).toContainText(ngo.legalName);
      await expect(aside).toContainText(ngo.email);

      const item = aside.getByRole('link', { name: current });
      await expect(item).toHaveAttribute('aria-current', 'page');
      await expect(item).toHaveCSS('background-color', 'rgb(245, 184, 46)');
      expect(await seriousAxeViolations(page)).toEqual([]);
    });
  }
});

test.describe('em 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('o ≡ abre o menu, que leva ao perfil e à página pública; "Sair" vai para /entrar', async ({
    page,
  }) => {
    await login(page);
    await expect(sidebar(page)).toBeHidden();
    const menu = page.getByRole('button', { name: t.header.openMenu });

    await menu.click();
    const dialog = page.getByRole('dialog', { name: t.header.nav });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('link', { name: t.header.publicPage }),
    ).toHaveAttribute('href', /^\/ong\/e2e-web-shell-/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();

    await menu.click();
    await dialog.getByRole('link', { name: t.header.profile }).press('Enter');
    await page.waitForURL('**/painel/perfil');
    await expect(dialog).toBeHidden();

    await page.goto('/painel');
    await menu.click();
    await dialog
      .getByRole('link', { name: t.header.publicPage })
      .press('Enter');
    await page.waitForURL(/\/ong\/e2e-web-shell-/);

    await page.goto('/painel');
    await menu.click();
    await dialog.getByRole('button', { name: t.header.logout }).press('Enter');
    await page.waitForURL('**/entrar');
  });
});
