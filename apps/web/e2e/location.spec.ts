import { expect, test, type Page } from '@playwright/test';
import { locationDictionary as t } from '../src/features/location/location.dictionary';
import type { LookupCepResult } from '../src/features/location/location.types';
import { seriousAxeViolations } from './axe';
import { HomePage } from './pages/home.page';
import { LocationPage } from './pages/location.page';

// São Paulo in the IBGE list the api serves (LOC-07).
const SAO_PAULO = { lat: -23.5329, lng: -46.6395 };

/**
 * The api resolves a CEP through BrasilAPI/ViaCEP, which the tests must not
 * call. So the browser's `lookupCep` request goes out with a short CEP (the
 * action answers it without the api) and the answer is swapped for `result`.
 */
async function stubCepLookup(page: Page, result: LookupCepResult) {
  const shortCepAnswer = JSON.stringify({ ok: false, error: t.cep.invalid });
  await page.route('**/localizacao', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST' || !request.headers()['next-action']) {
      return route.continue();
    }
    const response = await route.fetch({ postData: JSON.stringify(['0']) });
    const body = await response.text();
    if (!body.includes(shortCepAnswer)) {
      throw new Error(`Unexpected Server Action answer: ${body}`);
    }
    await route.fulfill({
      response,
      body: body.replace(shortCepAnswer, JSON.stringify(result)),
    });
  });
}

test.describe('boas-vindas → localização', () => {
  test('HOME-02: o CTA abre /localizacao sem pedir a localização', async ({
    page,
  }) => {
    const home = new HomePage(page);
    const location = new LocationPage(page);
    await location.spyOnGeolocation();

    await home.goto();
    await expect(home.ngoLink).toHaveAttribute('href', '/entrar');
    expect(await seriousAxeViolations(page)).toEqual([]);
    await home.findNgosLink.click();

    await expect(page).toHaveURL('/localizacao');
    await expect(location.useLocationButton).toBeVisible();
    expect(await location.geolocationCalls()).toEqual([]);
    expect(await seriousAxeViolations(page)).toEqual([]);
  });

  test('LOC-02/LOC-04: localização concedida abre /mapa centralizado nela', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -23.5869, longitude: -46.6347 });
    const location = new LocationPage(page);
    await location.spyOnGeolocation();

    await location.goto();
    await location.useLocationButton.click();

    await page.waitForURL('**/mapa#c=-23.5869,-46.6347&r=5');
    expect(await location.geolocationCalls()).toEqual([{ timeout: 10000 }]);
  });

  test('LOC-05: permissão negada mostra a busca manual com a instrução', async ({
    page,
    context,
  }) => {
    await context.clearPermissions();
    const location = new LocationPage(page);
    await location.spyOnGeolocation();

    await location.goto();
    await location.useLocationButton.click();

    await expect(location.notice).toContainText(t.denied.title);
    await expect(location.notice).toContainText(t.denied.text);
    await expect(location.cityField).toBeVisible();
    await expect(location.cepField).toBeVisible();
    expect(await location.geolocationCalls()).toHaveLength(1);
    expect(await seriousAxeViolations(page)).toEqual([]);
  });

  test('LOC-06: timeout mostra a busca manual sem a instrução', async ({
    page,
  }) => {
    const location = new LocationPage(page);
    await location.spyOnGeolocation({ timeout: true });

    await location.goto();
    await location.useLocationButton.click();

    await expect(location.notice).toContainText(t.unavailable.title);
    await expect(page.getByText(t.denied.text)).toHaveCount(0);
    await expect(location.cityField).toBeVisible();
  });
});

test.describe('busca manual', () => {
  test.beforeEach(async ({ page }) => {
    const location = new LocationPage(page);
    await location.spyOnGeolocation();
    await location.goto();
    await location.manualButton.click();
  });

  test('LOC-07: "Santa Cruz" sugere municípios do IBGE', async ({ page }) => {
    const location = new LocationPage(page);

    await location.cityField.fill('Santa Cruz');

    await expect(location.cityOption('Santa Cruz Cidade · RN')).toBeVisible();
    await expect(page.getByRole('option')).toHaveCount(5);
    expect(await seriousAxeViolations(page)).toEqual([]);
  });

  test('LOC-08: escolher "São Paulo" abre o mapa no município', async ({
    page,
  }) => {
    const location = new LocationPage(page);

    await location.cityField.fill('São Paulo');
    await location.cityOption('São Paulo Cidade · SP').click();

    await page.waitForURL(`**/mapa#c=${SAO_PAULO.lat},${SAO_PAULO.lng}&r=5`);
    expect(await location.geolocationCalls()).toEqual([]);
  });

  test('LOC-09: um CEP válido abre o mapa no ponto do CEP', async ({
    page,
  }) => {
    const location = new LocationPage(page);
    await stubCepLookup(page, {
      ok: true,
      address: {
        street: 'Avenida Paulista',
        district: 'Bela Vista',
        city: 'São Paulo',
        uf: 'SP',
        lat: -23.5613,
        lng: -46.6565,
      },
    });

    await location.searchCep('01310100');

    await page.waitForURL('**/mapa#c=-23.5613,-46.6565&r=5');
  });

  test('LOC-10: CEP inexistente mostra a mensagem e fica na tela', async ({
    page,
  }) => {
    const location = new LocationPage(page);
    await stubCepLookup(page, { ok: false, error: t.cep.notFound });

    await location.searchCep('00000000');

    await expect(page.getByText(t.cep.notFound)).toBeVisible();
    await expect(location.cepField).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL('/localizacao');
    expect(await seriousAxeViolations(page)).toEqual([]);
  });
});
