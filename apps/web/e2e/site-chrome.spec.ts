import { expect, test, type Page } from '@playwright/test';
import { SITE_TEXT } from '../src/components/ui/ui.dictionary';
import { MapPage } from './pages/map.page';

// T182 (PERF-08, C-07, C-08, H-05): the public header and footer of the figcraft.
// Seeds: Patas do Bairro and its Caramelo.
const ANIMAL =
  '/ong/patas-do-bairro/animais/5eed0002-0000-4000-8000-000000000001';
const WITH_FOOTER = ['/', '/ong/patas-do-bairro', ANIMAL];
const ROUTES = ['/', '/localizacao', ...WITH_FOOTER.slice(1)];

const banner = (page: Page) => page.getByRole('banner');

test.beforeEach(async ({ page }) => {
  await new MapPage(page).stubTiles();
});

test.describe('em 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const route of ROUTES) {
    test(`${route} tem o cabeçalho com logo, "Como funciona", "Mapa de ONGs" e "Sou uma ONG"`, async ({
      page,
    }) => {
      await page.goto(route);
      const header = banner(page);

      await expect(
        header.getByRole('link', { name: 'Animal Helper' }),
      ).toHaveAttribute('href', '/');
      await expect(
        header.getByRole('link', { name: SITE_TEXT.howItWorks }),
      ).toHaveAttribute('href', '/#como-funciona');
      await expect(
        header.getByRole('link', { name: SITE_TEXT.map }),
      ).toBeVisible();
      await expect(
        header.getByRole('link', { name: SITE_TEXT.ngo }),
      ).toHaveAttribute('href', '/entrar');
    });
  }

  for (const route of WITH_FOOTER) {
    test(`${route} termina no rodapé, com "Créditos das fotos" em /sobre-a-demo`, async ({
      page,
    }) => {
      await page.goto(route);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toBeVisible();
      await expect(
        footer.getByRole('link', { name: SITE_TEXT.credits }),
      ).toHaveAttribute('href', '/sobre-a-demo');

      const end = await footer.evaluate(
        (el) => el.getBoundingClientRect().bottom + window.scrollY,
      );
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      expect(Math.abs(height - end)).toBeLessThanOrEqual(1);
    });
  }

  test('"Como funciona" leva à seção da home', async ({ page }) => {
    await page.goto('/ong/patas-do-bairro');
    await banner(page)
      .getByRole('link', { name: SITE_TEXT.howItWorks })
      .click();

    await expect(page).toHaveURL(/\/#como-funciona$/);
    await expect(
      page.getByRole('region', { name: 'Como funciona' }),
    ).toBeInViewport();
  });
});

test.describe('em 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a home tem só o logo e o "Sou uma ONG" sublinhado no cabeçalho', async ({
    page,
  }) => {
    await page.goto('/');
    const header = banner(page);

    await expect(
      header.getByRole('link', { name: 'Animal Helper' }),
    ).toBeVisible();
    await expect(header.getByRole('link', { name: SITE_TEXT.ngo })).toHaveCSS(
      'text-decoration-line',
      'underline',
    );
    await expect(
      header.getByRole('link', { name: SITE_TEXT.howItWorks }),
    ).toBeHidden();
    await expect(header.getByRole('button')).toHaveCount(0);
  });
});
