import { execFileSync } from 'node:child_process';
import { expect, test, type Request } from '@playwright/test';
import { mapDictionary } from '../src/features/map/map.dictionary';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/auth.page';
import { HomePage } from './pages/home.page';
import { LocationPage } from './pages/location.page';
import { MapPage } from './pages/map.page';
import { NgoPage } from './pages/ngo.page';
import {
  createNgo,
  deleteMailsTo,
  deleteNgo,
  latestResetPath,
  mailCount,
  newTestIp,
} from './support/stack';

// SEC Independent Test: the visitor journey, its requests and the stack logs.
const IP = newTestIp();
test.use({
  reducedMotion: 'reduce',
  extraHTTPHeaders: { 'x-forwarded-for': IP },
});

const ROOT = new URL('../../../', import.meta.url);

/** Lines the services (api and web by default) wrote to the Compose logs since `since`. */
function stackLogs(since: Date, services = ['api', 'web']): string[] {
  return execFileSync(
    'docker',
    [
      'compose',
      'logs',
      ...services,
      '--no-log-prefix',
      '--since',
      since.toISOString(),
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ).split('\n');
}

test('SEC-01/02/03/04: a jornada do visitante não grava cookie, manda só bbox e species, e nada vai para os logs', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const startedAt = new Date(Date.now() - 1000);
  const requests: Request[] = [];
  page.on('request', (request) => requests.push(request));
  const mapBodies: string[] = [];
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname === '/map/ngos')
      mapBodies.push(await response.text());
  });
  const home = new HomePage(page);
  const location = new LocationPage(page);
  const map = new MapPage(page);
  await map.stubTiles();

  await home.goto();
  await home.findNgosLink.click();
  await location.manualButton.click();
  await location.cityField.fill('São Paulo');
  await location.cityOption('São Paulo Cidade · SP').click();
  await page.waitForURL('**/mapa#**');
  // The center lives only in the fragment, which never leaves the browser.
  const [lat, lng] = new URLSearchParams(new URL(page.url()).hash.slice(1))
    .get('c')!
    .split(',');
  await map.openSheet();
  await expect(map.listItem('Amigos de Quatro Patas')).toBeVisible();
  await page
    .getByRole('button', { name: mapDictionary.filters.dogs, exact: true })
    .click();
  await expect
    .poll(() =>
      requests.some((r) =>
        new URL(r.url()).searchParams.get('species')?.includes('DOG'),
      ),
    )
    .toBe(true);
  await map.listItem('Amigos de Quatro Patas').click();
  await map.previewLink.click();
  await page.waitForURL('**/ong/amigos-de-quatro-patas');
  await new NgoPage(page).animal('Bob').click();
  await page.waitForURL('**/ong/amigos-de-quatro-patas/animais/*');

  // SEC-03: no cookie at all for a visitor without login.
  expect(await context.cookies()).toEqual([]);

  // SEC-01: every map search carries only the bbox (2 decimals) and species.
  const searches = requests
    .map((r) => new URL(r.url()))
    .filter((url) => url.pathname === '/map/ngos');
  expect(searches.length).toBeGreaterThan(1);
  for (const url of searches) {
    expect(
      [...url.searchParams.keys()].every((key) =>
        ['bbox', 'species'].includes(key),
      ),
    ).toBe(true);
    expect(url.searchParams.get('bbox')).toMatch(
      /^-?\d+(\.\d{1,2})?(,-?\d+(\.\d{1,2})?){3}$/,
    );
  }
  // SEC-01: the center goes in no request to the server, URL or body.
  const toServer = requests.filter(
    (r) => new URL(r.url()).origin === new URL(page.url()).origin,
  );
  for (const request of toServer) {
    const sent = `${request.url()} ${request.postData() ?? ''}`;
    expect(sent).not.toContain(lat);
    expect(sent).not.toContain(lng);
  }

  // SEC-04: the public map answers carry no e-mail, CNPJ or password hash.
  expect(mapBodies.length).toBeGreaterThan(0);
  for (const body of mapBodies) {
    expect(body).not.toMatch(/"(email|cnpj|passwordHash)"/);
  }

  // SEC-01/02: neither the bbox nor the visitor IP reaches the logs.
  const logs = stackLogs(startedAt);
  // The api did log this journey: the check below isn't vacuous.
  expect(logs.some((line) => line.includes('"url":"/api/v1/ngos"'))).toBe(true);
  expect(logs.filter((line) => line.includes('bbox='))).toEqual([]);
  expect(logs.filter((line) => line.includes(IP))).toEqual([]);
});

test('SEC-08/T177: na recuperação de senha, o log do web de dev não tem o token do link nem o e-mail da ONG', async ({
  page,
}) => {
  const ngo = await createNgo(newTestIp(), 'e2e-web-privacy');
  try {
    const startedAt = new Date(Date.now() - 1000);
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();
    await forgot.request(ngo.email);
    await expect(forgot.sentHeading).toBeVisible();
    await expect.poll(() => mailCount(ngo.email)).toBe(1);
    const link = await latestResetPath(ngo.email);
    const token = link.split('/').at(-1)!;
    await new ResetPasswordPage(page).goto(link);
    await new ResetPasswordPage(page).save('novaSenha99');
    await page.waitForURL('**/entrar?senha=alterada');
    // deleteNgo signs in with it.
    ngo.password = 'novaSenha99';

    const logs = stackLogs(startedAt, ['web']);
    // The web did log this journey: the check below isn't vacuous.
    expect(logs.some((line) => line.includes('/recuperar-senha'))).toBe(true);
    expect(logs.filter((line) => line.includes(token))).toEqual([]);
    expect(logs.filter((line) => line.includes(ngo.email))).toEqual([]);
  } finally {
    await deleteNgo(ngo);
    await deleteMailsTo(ngo.email);
  }
});
