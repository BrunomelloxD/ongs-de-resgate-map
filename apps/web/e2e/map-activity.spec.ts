import { expect, test, type Page } from '@playwright/test';
import { ngoPageDictionary } from '../src/features/ngo-page/ngo-page.dictionary';
import { MapPage } from './pages/map.page';
import { NgoPage } from './pages/ngo.page';

// T168 (MAP-01, NGO-01): Next keeps a visited page in a hidden <Activity>.
// Coming back by history must show the map again, with its pins and no Leaflet error.
// Seeds: Patas do Bairro has Caramelo, Mel and Thor.
const PATAS = { slug: 'patas-do-bairro', name: 'Patas do Bairro' };
const PATAS_CENTER = { lat: -23.5869, lng: -46.6347 };
const LEAFLET_REUSE = 'Map container is being reused by another instance';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

/** Every console error and uncaught exception of the page. */
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await new MapPage(page).stubTiles();
});

test('/mapa → página da ONG → voltar: o mapa aparece com os pinos e sem erro no console', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const map = new MapPage(page);

  await map.goto(PATAS_CENTER);
  await expect(map.pin(PATAS.name)).toBeVisible();
  await map.listItem(PATAS.name).click();
  await map.previewLink.click();
  await page.waitForURL(`**/ong/${PATAS.slug}`);
  await expect(
    page.getByRole('heading', { level: 1, name: PATAS.name }),
  ).toBeVisible();

  await page.goBack();

  await page.waitForURL('**/mapa#**');
  await expect(map.map).toBeVisible();
  await expect(map.map).toHaveCount(1);
  await expect(map.pin(PATAS.name)).toBeVisible();
  expect(errors.filter((text) => text.includes(LEAFLET_REUSE))).toEqual([]);
  expect(errors).toEqual([]);
});

test('/ong/{slug} → animal → voltar: o minimapa aparece com o pino e sem erro no console', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const ngo = new NgoPage(page);
  const miniMap = page.getByRole('region', {
    name: ngoPageDictionary.profile.miniMapLabel(PATAS.name),
  });
  const pin = miniMap.getByRole('button', { name: PATAS.name, exact: true });

  await ngo.goto(PATAS.slug);
  await expect(pin).toBeVisible();
  await ngo.animal('Caramelo').click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Caramelo' }),
  ).toBeVisible();

  await page.goBack();

  await page.waitForURL(`**/ong/${PATAS.slug}`);
  await expect(miniMap).toBeVisible();
  await expect(miniMap).toHaveCount(1);
  await expect(pin).toBeVisible();
  expect(errors.filter((text) => text.includes(LEAFLET_REUSE))).toEqual([]);
  expect(errors).toEqual([]);
});
