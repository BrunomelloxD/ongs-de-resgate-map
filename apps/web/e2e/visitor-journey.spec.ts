import { expect, test, type Locator } from '@playwright/test';
import { seriousAxeViolations } from './axe';
import { AnimalPage } from './pages/animal.page';
import { HomePage } from './pages/home.page';
import { LocationPage } from './pages/location.page';
import { MapPage } from './pages/map.page';
import { NgoPage } from './pages/ngo.page';

// Seeds (apps/api/prisma/seeds): Patas do Bairro has Caramelo (male), Mel
// (female) and Thor (unavailable); Zeca has 3 photos; Recanto has no animals.
const PATAS = {
  slug: 'patas-do-bairro',
  name: 'Patas do Bairro',
  whatsapp: '5511987650001',
  lat: -23.5869,
  lng: -46.6347,
};

// Inside the 5 km around the São Paulo city center the map opens on.
const AMIGOS = {
  slug: 'amigos-de-quatro-patas',
  name: 'Amigos de Quatro Patas',
  whatsapp: '5511987650003',
  lat: -23.5058,
  lng: -46.6254,
};

function waUrl(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await new MapPage(page).stubTiles();
});

test('jornada: boas-vindas → cidade → mapa → ONG → animal → wa.me com a mensagem pronta', async ({
  page,
}) => {
  let taps = 0;
  let mapTaps = 0;
  let onMap = false;
  const tap = async (target: Locator) => {
    taps++;
    if (onMap) mapTaps++;
    await target.click();
  };
  // The adoption tap leaves for wa.me; answer it locally, never the real site.
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>wa.me</title>' }),
  );
  const home = new HomePage(page);
  const location = new LocationPage(page);
  const map = new MapPage(page);
  const ngo = new NgoPage(page);
  const animal = new AnimalPage(page);

  await home.goto();
  await tap(home.findNgosLink);
  await tap(location.manualButton);
  await location.cityField.fill('São Paulo');
  await tap(location.cityOption('São Paulo Cidade · SP'));
  await page.waitForURL('**/mapa#**');
  // The Goal counts taps from the already centered map (spec.md Goals).
  onMap = true;
  await map.openSheet();
  await tap(map.listItem(AMIGOS.name));
  await tap(map.previewLink);

  // NGO-01/03/04: the NGO page, its WhatsApp and the route.
  await page.waitForURL(`**/ong/${AMIGOS.slug}`);
  await expect(
    page.getByRole('heading', { level: 1, name: AMIGOS.name }),
  ).toBeVisible();
  await expect(ngo.whatsappLink).toHaveAttribute(
    'href',
    waUrl(AMIGOS.whatsapp, `Olá! Vi a ${AMIGOS.name} no Animal Helper.`),
  );
  await expect(ngo.directionsLink).toHaveAttribute(
    'href',
    `https://www.google.com/maps/dir/?api=1&destination=${AMIGOS.lat},${AMIGOS.lng}`,
  );
  await expect(ngo.directionsLink).toHaveAttribute('target', '_blank');
  await expect(ngo.today).toHaveCount(1);
  // NGO-05: "Só disponíveis" starts on.
  // T189 (O-06): a toggle chip, so "checked" is aria-pressed.
  await expect(ngo.onlyAvailable).toHaveAttribute('aria-pressed', 'true');
  expect(await seriousAxeViolations(page)).toEqual([]);

  await tap(ngo.animal('Bob'));

  // ANI-03/04: the adoption button carries the ready message.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bob' }),
  ).toBeVisible();
  await expect(animal.adoptLink('Bob', 'MALE')).toHaveAttribute(
    'href',
    waUrl(
      AMIGOS.whatsapp,
      'Olá! Vi o Bob no Animal Helper e quero saber como adotar.',
    ),
  );
  expect(await seriousAxeViolations(page)).toEqual([]);

  const adoptUrl = waUrl(
    AMIGOS.whatsapp,
    'Olá! Vi o Bob no Animal Helper e quero saber como adotar.',
  );
  await tap(animal.adoptLink('Bob', 'MALE'));
  await page.waitForURL(adoptUrl);

  // Goal: up to 5 taps from the centered map, the adoption tap included.
  expect(mapTaps).toBeLessThanOrEqual(5);
  test
    .info()
    .annotations.push(
      { type: 'toques a partir do mapa', description: String(mapTaps) },
      { type: 'toques desde a boas-vindas', description: String(taps) },
    );
});

test('ANI-03/04: fêmea → "Quero adotar a Mel" com "Vi a Mel"', async ({
  page,
}) => {
  const ngo = new NgoPage(page);
  await ngo.goto(PATAS.slug);

  await ngo.animal('Mel').click();

  await expect(new AnimalPage(page).adoptLink('Mel', 'FEMALE')).toHaveAttribute(
    'href',
    waUrl(
      PATAS.whatsapp,
      'Olá! Vi a Mel no Animal Helper e quero saber como adotar.',
    ),
  );
});

test('NGO-07/ANI-05: desligar "Só disponíveis" mostra o Thor indisponível, sem adoção', async ({
  page,
}) => {
  const ngo = new NgoPage(page);
  const animal = new AnimalPage(page);
  await ngo.goto(PATAS.slug);

  await ngo.onlyAvailable.click();

  await page.waitForURL(`**/ong/${PATAS.slug}?available=false`);
  const thor = ngo.animal('Thor');
  await expect(thor.getByText('Indisponível')).toBeVisible();
  await thor.click();
  await expect(animal.adoptButton('Thor', 'MALE')).toBeDisabled();
  await expect(animal.unavailableText('Thor')).toBeVisible();
  await expect(animal.otherAnimalsLink(PATAS.name)).toHaveAttribute(
    'href',
    `/ong/${PATAS.slug}`,
  );
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('NGO-06: o filtro de espécie vira search param e só mostra gatos', async ({
  page,
}) => {
  const ngo = new NgoPage(page);
  await ngo.goto(PATAS.slug);

  await ngo.filter('Espécie').selectOption('CAT');

  await page.waitForURL(`**/ong/${PATAS.slug}?species=CAT`);
  await expect(ngo.animal('Nina')).toBeVisible();
  await expect(ngo.animalCards).toHaveCount(1);
});

test('ANI-01: a galeria do Zeca começa em "1/3" e troca pela miniatura', async ({
  page,
}) => {
  const ngo = new NgoPage(page);
  const animal = new AnimalPage(page);
  await ngo.goto('amigos-de-quatro-patas');

  await ngo.animal('Zeca').click();

  await expect(animal.counter('1/3')).toBeVisible();
  await page.getByRole('button', { name: 'Ver foto 3 de 3' }).click();
  await expect(animal.counter('3/3')).toBeVisible();
});

test('NGO-08: ONG sem animais convida para o WhatsApp', async ({ page }) => {
  const ngo = new NgoPage(page);

  await ngo.goto('recanto-bicho-feliz');

  await expect(ngo.emptyNgoTitle('Recanto Bicho Feliz')).toBeVisible();
  await expect(ngo.animalCards).toHaveCount(0);
  await expect(
    page
      .locator('[data-slot="empty-state"]')
      // T189 (O-07): the invitation's button is "Perguntar no WhatsApp".
      .getByRole('link', { name: 'Perguntar no WhatsApp' }),
  ).toHaveAttribute(
    'href',
    waUrl('5511987650005', 'Olá! Vi a Recanto Bicho Feliz no Animal Helper.'),
  );
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('NGO-11: slug inexistente responde 404 com link para o mapa', async ({
  page,
}) => {
  const ngo = new NgoPage(page);

  const response = await ngo.goto('ong-que-nao-existe');

  expect(response?.status()).toBe(404);
  await expect(ngo.notFoundTitle).toBeVisible();
  await expect(ngo.mapLink).toHaveAttribute('href', '/mapa');
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('ANI-06: id inexistente ou de outra ONG responde 404 com link para o mapa', async ({
  page,
}) => {
  const animal = new AnimalPage(page);
  const missing = await page.goto(
    `/ong/${PATAS.slug}/animais/00000000-0000-4000-8000-000000000000`,
  );

  expect(missing?.status()).toBe(404);
  await expect(animal.notFoundTitle).toBeVisible();
  await expect(animal.mapLink).toHaveAttribute('href', '/mapa');
  expect(await seriousAxeViolations(page)).toEqual([]);

  // Caramelo belongs to Patas do Bairro, not to Gatil Esperança.
  const ngo = new NgoPage(page);
  await ngo.goto(PATAS.slug);
  await ngo.animal('Caramelo').click();
  await page.waitForURL(`**/ong/${PATAS.slug}/animais/*`);
  const id = page.url().split('/').pop()!;
  const foreign = await page.goto(`/ong/gatil-esperanca/animais/${id}`);
  expect(foreign?.status()).toBe(404);
});

test('SHARE-04: o HTML servido de /ong/{slug} tem og:title, og:image e o canonical', async ({
  request,
  baseURL,
}) => {
  const response = await request.get(`/ong/${PATAS.slug}`);
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(html).toContain(`<meta property="og:title" content="${PATAS.name}"/>`);
  expect(html).toMatch(
    /<meta property="og:image" content="https?:\/\/[^"]+\/img\/ngos\/[0-9a-f-]+\/logo\/[0-9a-f-]+-600\.webp"\/>/,
  );
  expect(html).toMatch(
    new RegExp(
      `<link rel="canonical" href="https?://[^"]+/ong/${PATAS.slug}"/>`,
    ),
  );
  expect(baseURL).toBeTruthy();
});

test('PERF-04/T176: o mini mapa só monta perto da área visível, no lugar da moldura do mesmo tamanho', async ({
  page,
}) => {
  // Short screen: the address map starts more than 200 px below the fold.
  await page.setViewportSize({ width: 390, height: 400 });
  const ngo = new NgoPage(page);
  await ngo.goto(PATAS.slug);
  const frame = page.locator('[data-slot="ngo-mini-map-frame"]');
  const map = page.locator('.leaflet-container');

  await expect(frame).toHaveCount(1);
  await expect(map).toHaveCount(0);
  const frameBox = (await frame.boundingBox())!;

  await frame.scrollIntoViewIfNeeded();

  await expect(map).toBeVisible();
  await expect(frame).toHaveCount(0);
  const mapBox = (await map.boundingBox())!;
  expect([mapBox.width, mapBox.height]).toEqual([
    frameBox.width,
    frameBox.height,
  ]);
});
