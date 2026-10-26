import { randomBytes } from 'node:crypto';
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { signupDictionary as t } from '../src/features/signup/signup.dictionary';
import { seriousAxeViolations } from './axe';
import { LoginPage } from './pages/auth.page';
import { MapPage } from './pages/map.page';
import { SignupPage } from './pages/signup.page';
import {
  badAnimalAlts,
  hasHorizontalScroll,
  smallTargets,
  unlabeledIconControls,
  usableWidth,
} from './support/layout';
import {
  createAnimals,
  createNgo,
  deleteNgo,
  ngoIdentity,
  newTestIp,
  withCheckDigits,
  type TestNgo,
} from './support/stack';

// A11Y-01/02/04/07/11/12, PERF-05/07: every screen at 360, 390 and 1440 px.
const WIDTHS = [360, 390, 1440] as const;
const MIN_USABLE_PX = 320;
const SAO_PAULO = '/mapa#c=-23.5329,-46.6395&r=5';
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

let ngo: TestNgo & { legalName: string };
let slug: string;
let animalId: string;
let session: Awaited<ReturnType<BrowserContext['storageState']>>;

test.beforeAll(async ({ browser }) => {
  ngo = await createNgo(newTestIp(), 'e2e-web-a11y');
  [animalId] = await createAnimals(ngo, [
    { name: 'Pipoca', species: 'DOG', sex: 'MALE' },
  ]);
  ({ slug } = await ngoIdentity(ngo));
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': newTestIp() },
  });
  const page = await context.newPage();
  const login = new LoginPage(page);
  await login.goto();
  await login.login(ngo.email, ngo.password);
  await page.waitForURL('**/painel');
  session = await context.storageState();
  await context.close();
});

test.afterAll(async () => {
  await deleteNgo(ngo);
});

/** Every check of the task on the screen as it is now. */
async function checkScreen(page: Page, width: number) {
  await page.waitForLoadState('networkidle');
  expect(await seriousAxeViolations(page), 'axe').toEqual([]);
  expect(await hasHorizontalScroll(page), 'rolagem horizontal').toBe(false);
  expect(await smallTargets(page), 'alvos < 44×44 px').toEqual([]);
  expect(await unlabeledIconControls(page), 'ícone sem aria-label').toEqual([]);
  expect(await badAnimalAlts(page), 'alt das fotos de animais').toEqual([]);
  if (width === 1440) {
    expect(
      await usableWidth(page.locator('main').first()),
      'largura útil da coluna principal',
    ).toBeGreaterThanOrEqual(MIN_USABLE_PX);
  }
}

const PUBLIC: { name: string; path: () => string }[] = [
  { name: 'boas-vindas', path: () => '/' },
  { name: 'localização', path: () => '/localizacao' },
  { name: 'mapa', path: () => SAO_PAULO },
  { name: 'mapa sem localização', path: () => '/mapa' },
  { name: 'página da ONG', path: () => '/ong/patas-do-bairro' },
  { name: 'detalhe do animal', path: () => `/ong/${slug}/animais/${animalId}` },
  { name: 'ONG inexistente (404)', path: () => '/ong/ong-que-nao-existe' },
  { name: 'login', path: () => '/entrar' },
  { name: 'recuperar senha', path: () => '/recuperar-senha' },
  {
    name: 'nova senha (link inválido)',
    path: () => '/recuperar-senha/link-invalido',
  },
  { name: 'sobre a demo', path: () => '/sobre-a-demo' },
  { name: 'termos', path: () => '/termos' },
  { name: 'privacidade', path: () => '/privacidade' },
];

const PRIVATE: { name: string; path: () => string }[] = [
  { name: 'painel', path: () => '/painel' },
  { name: 'novo animal', path: () => '/painel/animais/novo' },
  { name: 'editar animal', path: () => `/painel/animais/${animalId}` },
  { name: 'perfil', path: () => '/painel/perfil' },
];

async function open(browser: Browser, width: number, loggedIn: boolean) {
  const context = await browser.newContext({
    viewport: { width, height: width === 1440 ? 900 : 800 },
    reducedMotion: 'reduce',
    extraHTTPHeaders: { 'x-forwarded-for': newTestIp() },
    storageState: loggedIn ? session : undefined,
  });
  const page = await context.newPage();
  await new MapPage(page).stubTiles();
  return { page, context };
}

for (const width of WIDTHS) {
  test.describe(`em ${width} px`, () => {
    for (const screen of PUBLIC) {
      test(`${screen.name}`, async ({ browser }) => {
        const { page, context } = await open(browser, width, false);
        await page.goto(screen.path());
        await checkScreen(page, width);
        await context.close();
      });
    }

    for (const screen of PRIVATE) {
      test(`${screen.name} (área da ONG)`, async ({ browser }) => {
        const { page, context } = await open(browser, width, true);
        await page.goto(screen.path());
        await expect(page).not.toHaveURL(/\/entrar/);
        await checkScreen(page, width);
        await context.close();
      });
    }

    test('as 5 etapas do cadastro', async ({ browser }) => {
      test.setTimeout(90_000);
      const { page, context } = await open(browser, width, false);
      const signup = new SignupPage(page);
      await signup.stubAddressServices(MANAUS_CEP, {
        found: true,
        lat: -3.1316,
        lng: -60.0233,
      });
      const key = randomBytes(4).toString('hex');

      await signup.goto();
      await checkScreen(page, width);
      await signup.fillAbout({
        cnpj: withCheckDigits(
          Array.from(randomBytes(12), (b) => String(b % 10)).join(''),
        ),
        legalName: `e2e-web-a11y cadastro ${key}`,
        description: 'ONG do e2e de acessibilidade e layout, nunca enviada.',
      });
      await signup.press(t.about.submit);
      await page.waitForURL('**/cadastro/contato');
      await checkScreen(page, width);
      await signup.fillContact({
        email: `e2e-web-a11y-${key}@example.com`,
        whatsapp: '92987654321',
        password: 'senha1234',
      });
      await signup.press(t.contact.submit);
      await page.waitForURL('**/cadastro/endereco');
      await signup.cepField.fill('69005070');
      await signup.numberField.fill('100');
      await signup.numberField.blur();
      await expect(signup.pin).toBeVisible();
      await checkScreen(page, width);
      await signup.confirmLocation.press('Enter');
      await signup.press(t.address.submit);
      await page.waitForURL('**/cadastro/horario');
      await checkScreen(page, width);
      await signup.press(t.hours.submit);
      await page.waitForURL('**/cadastro/revisao');
      await checkScreen(page, width);
      await context.close();
    });
  });
}
