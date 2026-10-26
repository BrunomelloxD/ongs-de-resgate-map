import { randomBytes } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { ngoAccountDictionary } from '../src/features/ngo-account/ngo-account.dictionary';
import { signupDictionary as t } from '../src/features/signup/signup.dictionary';
import { LoginPage } from './pages/auth.page';
import { MapPage } from './pages/map.page';
import { SignupPage } from './pages/signup.page';
import {
  createNgo,
  deleteNgo,
  newTestIp,
  withCheckDigits,
  type TestNgo,
} from './support/stack';

// PERF-01: only the routes with a map download Leaflet.
// A string of Leaflet's own source (its attribution prefix), in any build.
const LEAFLET_SIGNATURE = 'A JavaScript library for interactive maps';
const MANAUS_CEP = {
  ok: true as const,
  address: {
    street: 'Avenida Eduardo Ribeiro',
    district: 'Centro',
    city: 'Manaus',
    uf: 'AM',
    lat: -3.1316,
    lng: -60.0233,
  },
};
const FOUND = { found: true, lat: -3.1316, lng: -60.0233 };

let ngo: TestNgo & { legalName: string };

test.beforeAll(async () => {
  ngo = await createNgo(newTestIp(), 'e2e-web-bundle');
});

test.afterAll(async () => {
  await deleteNgo(ngo);
});

/**
 * A fresh context per route, so nothing comes from an earlier page. Records
 * whether any script it downloads is Leaflet.
 */
async function openFresh(browser: Browser, { login = false } = {}) {
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': newTestIp() },
  });
  const page = await context.newPage();
  await new MapPage(page).stubTiles();
  if (login) {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ngo.email, ngo.password);
    await page.waitForURL('**/painel');
  }
  const scripts: Promise<boolean>[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() !== 'script') return;
    // A request cancelled by page.reload() never ran, and its body may never
    // arrive: read the body only once the request has really finished (T178).
    scripts.push(
      response
        .finished()
        .then((failure) =>
          failure
            ? false
            : response.text().then((body) => body.includes(LEAFLET_SIGNATURE)),
        )
        .catch(() => false),
    );
  });
  const loadedLeaflet = async () => {
    await page.waitForLoadState('networkidle');
    return (await Promise.all(scripts)).some(Boolean);
  };
  return { page, context, loadedLeaflet };
}

async function reachAddressStep(page: Page) {
  const signup = new SignupPage(page);
  await signup.stubAddressServices(MANAUS_CEP, FOUND);
  await signup.goto();
  await page.waitForLoadState('networkidle');
  await signup.fillAbout({
    cnpj: withCheckDigits(
      Array.from(randomBytes(12), (b) => String(b % 10)).join(''),
    ),
    legalName: 'e2e-web-bundle cadastro',
    description: 'ONG do e2e do carregamento do Leaflet, nunca enviada.',
  });
  await signup.press(t.about.submit);
  await page.waitForURL('**/cadastro/contato');
  await signup.fillContact({
    email: `e2e-web-bundle-${Date.now()}@example.com`,
    whatsapp: '92987654321',
    password: 'senha1234',
  });
  await signup.press(t.contact.submit);
  await page.waitForURL('**/cadastro/endereco');
  return signup;
}

for (const path of ['/', '/localizacao', '/entrar']) {
  test(`PERF-01: ${path} não carrega o Leaflet`, async ({ browser }) => {
    const { page, context, loadedLeaflet } = await openFresh(browser);
    await page.goto(path);
    expect(await loadedLeaflet()).toBe(false);
    await context.close();
  });
}

test('PERF-01: /painel não carrega o Leaflet', async ({ browser }) => {
  const { page, context, loadedLeaflet } = await openFresh(browser, {
    login: true,
  });
  await page.reload();
  expect(await loadedLeaflet()).toBe(false);
  await context.close();
});

test('PERF-01: /mapa carrega o Leaflet', async ({ browser }) => {
  const { page, context, loadedLeaflet } = await openFresh(browser);
  await page.goto('/mapa#c=-23.5869,-46.6347&r=5');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  expect(await loadedLeaflet()).toBe(true);
  await context.close();
});

test('PERF-01: /ong/{slug} carrega o Leaflet (mini mapa)', async ({
  browser,
}) => {
  const { page, context, loadedLeaflet } = await openFresh(browser);
  await page.goto('/ong/patas-do-bairro');
  // T189: the mini map moved below the summary; it mounts near the viewport (T176).
  await page
    .locator('[data-slot="ngo-mini-map-frame"]')
    .scrollIntoViewIfNeeded();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  expect(await loadedLeaflet()).toBe(true);
  await context.close();
});

test('PERF-01: o cadastro só carrega o Leaflet na etapa Endereço', async ({
  browser,
}) => {
  const { page, context, loadedLeaflet } = await openFresh(browser);
  const signup = await reachAddressStep(page);
  // The steps before it didn't need the map.
  expect(await loadedLeaflet()).toBe(false);

  await signup.cepField.fill('69005070');
  await signup.numberField.fill('100');
  await signup.numberField.blur();
  await expect(signup.pin).toBeVisible();
  expect(await loadedLeaflet()).toBe(true);
  await context.close();
});

test('PERF-01: /painel/perfil carrega o Leaflet', async ({ browser }) => {
  const { page, context, loadedLeaflet } = await openFresh(browser, {
    login: true,
  });
  await page.goto('/painel/perfil');
  await expect(
    page.getByRole('heading', { name: ngoAccountDictionary.profile.title }),
  ).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  expect(await loadedLeaflet()).toBe(true);
  await context.close();
});
