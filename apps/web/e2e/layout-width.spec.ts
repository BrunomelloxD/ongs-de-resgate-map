import { expect, test, type Locator, type Page } from '@playwright/test';
import { mapDictionary as m } from '../src/features/map/map.dictionary';
import { MapPage } from './pages/map.page';

// T166/PERF-05: narrow columns keep room for content on desktop and never
// scroll sideways on a phone.
const MIN_USABLE_PX = 320;
const SAO_PAULO = { lat: -23.5329, lng: -46.6395 };

/** Width left for content: the box minus its horizontal padding. */
function usableWidth(locator: Locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return (
      el.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)
    );
  });
}

function hasHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}

const SCREENS: {
  name: string;
  open: (page: Page) => Promise<unknown>;
  column: (page: Page) => Locator;
}[] = [
  {
    name: 'formulário do /entrar',
    open: (page) => page.goto('/entrar'),
    column: (page) => page.locator('main form'),
  },
  {
    name: 'formulário do /recuperar-senha',
    open: (page) => page.goto('/recuperar-senha'),
    column: (page) => page.locator('main form'),
  },
  {
    name: 'formulário da primeira etapa do cadastro',
    open: (page) => page.goto('/cadastro/sobre'),
    column: (page) => page.locator('main form'),
  },
  {
    name: 'lista do mapa',
    open: (page) => new MapPage(page).goto(SAO_PAULO),
    column: (page) => page.getByRole('complementary', { name: m.list.label }),
  },
  {
    name: 'coluna do mapa sem localização (MAP-15)',
    open: (page) => page.goto('/mapa'),
    column: (page) =>
      page
        .getByRole('heading', { name: m.locationError.title })
        .locator('xpath=..'),
  },
];

test.beforeEach(async ({ page }) => {
  await new MapPage(page).stubTiles();
});

test.describe('em 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const screen of SCREENS) {
    test(`${screen.name} tem pelo menos ${MIN_USABLE_PX} px de largura útil`, async ({
      page,
    }) => {
      await screen.open(page);
      const column = screen.column(page);
      await expect(column).toBeVisible();

      expect(await usableWidth(column)).toBeGreaterThanOrEqual(MIN_USABLE_PX);
    });
  }
});

test.describe('em 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const screen of SCREENS.filter(({ name }) => name !== 'lista do mapa')) {
    test(`${screen.name} não rola na horizontal`, async ({ page }) => {
      await screen.open(page);
      await expect(screen.column(page)).toBeVisible();

      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }

  test('o mapa não rola na horizontal', async ({ page }) => {
    await new MapPage(page).goto(SAO_PAULO);
    await expect(page.getByRole('region', { name: m.mapLabel })).toBeVisible();

    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});
