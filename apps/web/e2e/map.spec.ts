import { expect, test } from '@playwright/test';
import { mapDictionary as t } from '../src/features/map/map.dictionary';
import { seriousAxeViolations } from './axe';
import { MapPage } from './pages/map.page';

// Seeds (apps/api/prisma/seeds/ngo.seed.ts): 5 active NGOs in São Paulo.
const PATAS = { lat: -23.5869, lng: -46.6347 };
const SAO_PAULO = { lat: -23.5329, lng: -46.6395 };
const SEED_NGOS = [
  'Patas do Bairro',
  'Gatil Esperança',
  'Amigos de Quatro Patas',
  'Casa Pet Solidária',
  'Recanto Bicho Feliz',
];
// Lisbon: outside Brazil, no NGO around (Edge Cases).
const LISBON = { lat: 38.7223, lng: -9.1393 };

const VIEWPORTS = [
  { name: '390 px', width: 390, height: 844 },
  { name: '1440 px', width: 1440, height: 900 },
] as const;

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await new MapPage(page).stubTiles();
});

for (const viewport of VIEWPORTS) {
  test.describe(`mapa em ${viewport.name}`, () => {
    test.use({ viewport });

    test('MAP-01/MAP-20: São Paulo mostra as ONGs das seeds e a atribuição', async ({
      page,
    }) => {
      const map = new MapPage(page);

      await map.goto(SAO_PAULO, 25);

      await expect(map.map).toBeVisible();
      await expect(map.attribution).toContainText(
        '© OpenStreetMap contributors',
      );
      await map.openSheet();
      for (const name of SEED_NGOS) {
        await expect(map.listItem(name)).toBeVisible();
      }
      // MAP-04: pins and clusters are on the map.
      await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
      expect(await seriousAxeViolations(page)).toEqual([]);
    });

    test('A11Y-08/MAP-05: Tab chega ao pino e Enter abre a prévia', async ({
      page,
    }) => {
      const map = new MapPage(page);
      await map.goto(PATAS);
      const pin = map.pin('Patas do Bairro');
      await expect(pin).toBeVisible();

      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        if (await pin.evaluate((el) => el === document.activeElement)) break;
      }
      await expect(pin).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(map.previewLink).toHaveAttribute(
        'href',
        '/ong/patas-do-bairro',
      );
      expect(await seriousAxeViolations(page)).toEqual([]);
    });

    test('MAP-13: centro sem ONGs (fora do Brasil) mostra o estado vazio', async ({
      page,
    }) => {
      const map = new MapPage(page);

      await map.goto(LISBON);

      await map.openSheet();
      await expect(map.emptyTitle).toBeVisible();
      await expect(
        page.getByRole('button', { name: t.list.empty.widen }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: t.list.empty.otherCity }),
      ).toHaveAttribute('href', '/localizacao');
      expect(await seriousAxeViolations(page)).toEqual([]);
    });

    test('MAP-16: api falhando mostra o erro com o mapa visível', async ({
      page,
    }) => {
      const map = new MapPage(page);
      await map.failSearch();

      await map.goto(SAO_PAULO);

      await map.openSheet();
      await expect(map.searchError).toBeVisible();
      await expect(
        page.getByRole('button', { name: t.list.error.retry }),
      ).toBeVisible();
      await expect(map.map).toBeVisible();
      expect(await seriousAxeViolations(page)).toEqual([]);
    });
  });
}

test('MAP-12: enquanto a busca carrega, mostra "Buscando ONGs perto de você…"', async ({
  page,
}) => {
  const map = new MapPage(page);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/map/ngos?**', async (route) => {
    await held;
    await route.continue();
  });

  await map.goto(PATAS);

  await expect(
    page.getByRole('status').filter({ hasText: t.list.loading }),
  ).toBeAttached();
  release();
  await map.openSheet();
  await expect(map.listItem('Patas do Bairro')).toBeVisible();
});

test('SEC-01: o navegador manda só a bbox com 2 casas e nada do centro', async ({
  page,
}) => {
  const map = new MapPage(page);
  const searches: URL[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/map/ngos'))
      searches.push(new URL(request.url()));
  });

  await map.goto({ lat: -23.58694321, lng: -46.63471234 });
  await map.openSheet();
  await expect(map.listItem('Patas do Bairro')).toBeVisible();

  expect(searches.length).toBeGreaterThan(0);
  for (const url of searches) {
    expect([...url.searchParams.keys()]).toEqual(['bbox']);
    expect(url.searchParams.get('bbox')).toMatch(
      /^-?\d+(\.\d{1,2})?(,-?\d+(\.\d{1,2})?){3}$/,
    );
    expect(url.href).not.toContain('58694321');
  }
});

test('MAP-17: arrastar o mapa para o sul traz a Patas do Bairro, fora dos 5 km iniciais', async ({
  page,
}) => {
  const map = new MapPage(page);
  const searches: URL[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/map/ngos'))
      searches.push(new URL(request.url()));
  });
  // Patas do Bairro is ~6 km south of the city center; Amigos is ~3 km away.
  await map.goto(SAO_PAULO);
  await map.openSheet();
  await expect(map.listItem('Amigos de Quatro Patas')).toBeVisible();
  await expect(map.listItem('Patas do Bairro')).toHaveCount(0);
  await expect(map.pin('Patas do Bairro')).toHaveCount(0);
  // The map's own fit keeps the center it opened with.
  expect(new URL(page.url()).hash).toBe('#c=-23.5329,-46.6395&r=5');

  // Dragging up moves the view south.
  await map.drag(0, -200);

  await expect(map.listItem('Patas do Bairro')).toBeVisible();
  await expect(map.pin('Patas do Bairro')).toBeVisible();
  // The fragment keeps the radius and takes the new center, further south.
  await expect(page).toHaveURL(/#c=-23\.\d+,-46\.\d+&r=5$/);
  const lat = Number(/#c=(-[\d.]+),/.exec(page.url())![1]);
  expect(lat).toBeLessThan(SAO_PAULO.lat);
  // SEC-01: the new center stays in the browser; only the bbox goes out.
  expect(searches.length).toBeGreaterThan(1);
  for (const url of searches) {
    expect([...url.searchParams.keys()]).toEqual(['bbox']);
    expect(url.searchParams.get('bbox')).toMatch(
      /^-?\d+(\.\d{1,2})?(,-?\d+(\.\d{1,2})?){3}$/,
    );
  }
});

test('A11Y-09: com movimento reduzido, o bottom sheet não anima', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const map = new MapPage(page);

  await map.goto(PATAS);

  await expect(page.locator('[data-slot="bottom-sheet"]')).toHaveCSS(
    'transition-duration',
    '0s',
  );
});
