import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from './pages/auth.page';
import { MapPage } from './pages/map.page';
import { createNgo, deleteNgo, newTestIp, type TestNgo } from './support/stack';

// T183 (PERF-08, PERF-07, C-10, C-28): the action bar of the figcraft.
// Seed: Caramelo, available, of Patas do Bairro.
const ANIMAL =
  '/ong/patas-do-bairro/animais/5eed0002-0000-4000-8000-000000000001';

test.use({ extraHTTPHeaders: { 'x-forwarded-for': newTestIp() } });

let ngo: TestNgo;

test.beforeAll(async () => {
  ngo = await createNgo(newTestIp(), 'e2e-web-bar');
});

test.afterAll(async () => {
  await deleteNgo(ngo);
});

const bar = (page: Page) => page.locator('[data-slot="action-bar"]');

async function login(page: Page) {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(ngo.email, ngo.password);
  await page.waitForURL('**/painel');
}

const SCREENS: { path: string; private?: boolean }[] = [
  { path: '/cadastro/sobre' },
  { path: ANIMAL },
  { path: '/painel/animais/novo', private: true },
  { path: '/painel/perfil', private: true },
];

test.describe('em 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const screen of SCREENS) {
    test(`${screen.path}: a barra fica fixa no rodapé e o fim da página aparece acima dela`, async ({
      page,
    }) => {
      await new MapPage(page).stubTiles();
      if (screen.private) await login(page);
      await page.goto(screen.path);
      const actions = bar(page);
      await expect(actions).toBeVisible();
      await expect(actions).toHaveCSS('position', 'fixed');

      const box = (await actions.boundingBox())!;
      expect(box.y + box.height).toBeCloseTo(844, 0);
      for (const button of await actions
        .locator('button, a')
        .filter({ visible: true })
        .all()) {
        if ((await button.textContent())?.includes('Ver outros')) continue;
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(52);
      }

      // The body reserves the bar's height, so the end of the page scrolls above it.
      const padding = await page.evaluate(() =>
        parseFloat(getComputedStyle(document.body).paddingBottom),
      );
      expect(padding).toBeGreaterThanOrEqual(box.height - 1);
    });
  }
});

test.describe('em 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('no cadastro, o primário fica à direita, com a largura do texto', async ({
    page,
  }) => {
    await page.goto('/cadastro/sobre');
    const actions = bar(page);
    await expect(actions).toHaveCSS('position', 'static');

    const row = (await actions.boundingBox())!;
    const primary = (await actions.getByRole('button').last().boundingBox())!;
    expect(primary.x + primary.width).toBeCloseTo(row.x + row.width, 0);
    expect(primary.width).toBeLessThan(row.width / 2);
  });

  test('no perfil, o "Salvar alterações" fica à direita', async ({ page }) => {
    await login(page);
    await page.goto('/painel/perfil');
    const actions = bar(page);
    await expect(actions).toHaveCSS('position', 'static');

    const row = (await actions.boundingBox())!;
    const primary = (await actions.getByRole('button').last().boundingBox())!;
    expect(primary.x + primary.width).toBeCloseTo(row.x + row.width, 0);
  });
});
