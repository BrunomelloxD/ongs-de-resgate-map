import { expect, test, type Page } from '@playwright/test';
import { NAVBAR_TEXT as t } from '../src/components/ui/ui.dictionary';
import { seriousAxeViolations } from './axe';
import { LoginPage } from './pages/auth.page';
import { MapPage } from './pages/map.page';
import { Navbar } from './pages/navbar.page';
import { createNgo, deleteNgo, newTestIp, type TestNgo } from './support/stack';

// T196 (PERF-08, A11Y-01 to A11Y-03, SEC-03): the figcraft "Navbar" page.
// Seeds: Patas do Bairro and its Caramelo.
const ANIMAL =
  '/ong/patas-do-bairro/animais/5eed0002-0000-4000-8000-000000000001';
const MAP = '/mapa#c=-23.5869,-46.6347&r=5';
const ROUTES = [
  '/',
  '/localizacao',
  MAP,
  '/ong/patas-do-bairro',
  ANIMAL,
  '/sobre-a-demo',
  '/termos',
  '/privacidade',
];
const MAP_ACTIVE = new Set(['/localizacao', MAP]);

test.use({ extraHTTPHeaders: { 'x-forwarded-for': newTestIp() } });

test.beforeEach(async ({ page }) => {
  await new MapPage(page).stubTiles();
});

/** The navbar asks its state once the page is hydrated. */
async function gotoHydrated(page: Page, route: string) {
  const status = page.waitForResponse('**/session/status');
  await page.goto(route);
  return status;
}

const bottomOf = async (page: Page) => {
  const box = (await new Navbar(page).bar.boundingBox())!;
  return box.y + box.height;
};

test.describe('em 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const route of ROUTES) {
    test(`${route}: navbar de 80 px com os links, "Entrar" e "Cadastrar minha ONG"; sem cookie`, async ({
      page,
      context,
    }) => {
      const navbar = new Navbar(page);
      const status = await gotoHydrated(page, route);

      // SEC-03: the state answer writes no cookie, and the visitor has none.
      expect(await status.headerValue('set-cookie')).toBeNull();
      expect(await status.json()).toEqual({ loggedIn: false });
      await expect(navbar.bar).toBeVisible();
      expect((await navbar.bar.boundingBox())!.height).toBe(80);
      await expect(navbar.logo).toHaveAttribute('href', '/');
      await expect(navbar.link(t.map)).toHaveAttribute('href', '/localizacao');
      await expect(navbar.link(t.howItWorks)).toHaveAttribute(
        'href',
        '/#como-funciona',
      );
      await expect(navbar.link(t.forNgos)).toHaveAttribute(
        'href',
        '/#para-ongs',
      );
      await expect(navbar.login).toBeVisible();
      await expect(navbar.signup).toBeVisible();
      await expect(navbar.menuButton).toBeHidden();
      if (MAP_ACTIVE.has(route)) {
        await expect(navbar.link(t.map)).toHaveAttribute(
          'aria-current',
          'page',
        );
      } else {
        await expect(navbar.bar.locator('[aria-current="page"]')).toHaveCount(
          0,
        );
      }
      expect(await context.cookies()).toEqual([]);
      expect(await seriousAxeViolations(page)).toEqual([]);
    });
  }

  test('fixa no topo: sem fundo no topo; depois de rolar, fundo #F5F3EE, sombra e linha', async ({
    page,
  }) => {
    const navbar = new Navbar(page);
    await gotoHydrated(page, '/');

    await expect(navbar.bar).toHaveAttribute('data-raised', 'false');
    await expect(navbar.bar).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.mouse.wheel(0, 1200);
    await expect(navbar.bar).toHaveAttribute('data-raised', 'true');
    await expect(navbar.bar).toHaveCSS(
      'background-color',
      'rgb(245, 243, 238)',
    );
    await expect(navbar.bar).not.toHaveCSS('box-shadow', 'none');
    expect((await navbar.bar.boundingBox())!.y).toBe(0);
  });

  test('"Pular para o conteúdo" é o primeiro Tab e leva ao <main>', async ({
    page,
  }) => {
    const navbar = new Navbar(page);
    await gotoHydrated(page, '/');

    await page.keyboard.press('Tab');
    await expect(navbar.skipLink).toBeFocused();
    await expect(navbar.skipLink).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#conteudo$/);
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        document.querySelector('main')!.contains(document.activeElement),
      ),
    ).toBe(true);
  });

  test('"Para ONGs" leva à seção da home, sem a navbar por cima', async ({
    page,
  }) => {
    const navbar = new Navbar(page);
    await gotoHydrated(page, '/ong/patas-do-bairro');

    await navbar.link(t.forNgos).click();

    await expect(page).toHaveURL(/\/#para-ongs$/);
    const section = page.locator('#para-ongs');
    await expect(section).toBeInViewport();
    await expect
      .poll(async () => (await section.boundingBox())!.y)
      .toBeGreaterThanOrEqual((await bottomOf(page)) - 1);
  });

  test('mapa: sempre "Rolada"; a coluna e o mapa começam embaixo dela, sem o topo antigo', async ({
    page,
  }) => {
    const navbar = new Navbar(page);
    await gotoHydrated(page, MAP);
    const column = page.getByRole('complementary');

    await expect(navbar.bar).toHaveAttribute('data-raised', 'true');
    await expect(column).toBeVisible();
    expect((await column.boundingBox())!.y).toBeGreaterThanOrEqual(
      (await bottomOf(page)) - 1,
    );
    await expect(
      column.getByRole('link', { name: 'Animal Helper' }),
    ).toHaveCount(0);
  });
});

test.describe('em 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    test(`${route}: navbar de 64 px com o logo e o ≡`, async ({ page }) => {
      const navbar = new Navbar(page);
      await gotoHydrated(page, route);

      await expect(navbar.bar).toBeVisible();
      expect((await navbar.bar.boundingBox())!.height).toBe(64);
      await expect(navbar.logo).toBeVisible();
      await expect(navbar.menuButton).toBeVisible();
      await expect(navbar.login).toBeHidden();
      await expect(navbar.link(t.map)).toBeHidden();
      const target = (await navbar.menuButton.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    });
  }

  test('o ≡ abre o menu em tela cheia, navega e fecha; Esc devolve o foco ao ≡', async ({
    page,
  }) => {
    const navbar = new Navbar(page);
    await gotoHydrated(page, MAP);

    await expect(navbar.menuButton).toHaveAttribute('aria-expanded', 'false');
    await navbar.menuButton.click();
    await expect(navbar.menu).toBeVisible();
    await expect(navbar.menuTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(navbar.menuLink(t.map)).toHaveAttribute(
      'aria-current',
      'page',
    );
    const box = (await navbar.menu.boundingBox())!;
    expect([box.width, box.height].map(Math.round)).toEqual([390, 844]);
    await expect(navbar.menu).toHaveCSS('background-color', 'rgb(22, 58, 43)');
    expect(await seriousAxeViolations(page)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(navbar.menu).toBeHidden();
    await expect(navbar.menuButton).toBeFocused();

    await navbar.menuButton.click();
    await navbar.menuLink(t.howItWorks).click();
    await expect(page).toHaveURL(/\/#como-funciona$/);
    await expect(navbar.menu).toBeHidden();
  });

  test('mapa: a busca flutua 16 px abaixo da navbar e o "centralizar em mim" desce junto', async ({
    page,
  }) => {
    await gotoHydrated(page, MAP);
    const bottom = await bottomOf(page);
    const bar = page.locator('[data-slot="map-search-bar"]');

    await expect(bar).toBeVisible();
    expect(Math.round((await bar.boundingBox())!.y - bottom)).toBe(16);
    const locate = (await page
      .getByRole('button', { name: 'Centralizar em mim' })
      .boundingBox())!;
    expect(Math.round(locate.y - bottom)).toBe(84);
  });

  test('página da ONG: a capa começa embaixo da navbar, com o ← e o compartilhar sobre a foto', async ({
    page,
  }) => {
    await gotoHydrated(page, '/ong/patas-do-bairro');
    const bottom = await bottomOf(page);
    const cover = page.locator('[data-slot="ngo-cover"]');

    expect(Math.round((await cover.boundingBox())!.y)).toBe(Math.round(bottom));
    for (const name of ['Voltar', 'Compartilhar']) {
      const button = (await cover
        .getByRole('link', { name })
        .or(cover.getByRole('button', { name }))
        .boundingBox())!;
      expect(button.y).toBeGreaterThan(bottom);
    }
  });
});

test.describe('com a ONG logada', () => {
  let ngo: TestNgo & { legalName: string };

  test.beforeAll(async () => {
    ngo = await createNgo(newTestIp(), 'e2e-21h-navbar');
  });

  test.afterAll(async () => {
    await deleteNgo(ngo);
  });

  async function login(page: Page) {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(ngo.email, ngo.password);
    await page.waitForURL('**/painel');
  }

  test('1440 px: "Área da ONG" com o nome troca "Entrar" e "Cadastrar minha ONG"', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    const navbar = new Navbar(page);
    await gotoHydrated(page, '/');

    await expect(navbar.ngoArea).toHaveAttribute('href', '/painel');
    await expect(navbar.ngoArea).toContainText(ngo.legalName);
    await expect(navbar.login).toHaveCount(0);
    await expect(navbar.signup).toHaveCount(0);
    expect(await seriousAxeViolations(page)).toEqual([]);
  });

  test('390 px: o avatar fica na barra; o menu tem "Ir para a Área da ONG" e "Sair" funciona', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const navbar = new Navbar(page);
    await gotoHydrated(page, '/ong/patas-do-bairro');

    await expect(navbar.ngoArea).toBeVisible();
    const avatar = (await navbar.ngoArea.boundingBox())!;
    expect(avatar.height).toBeGreaterThanOrEqual(44);
    await navbar.menuButton.click();
    await expect(navbar.menu).toContainText(ngo.legalName);
    await expect(navbar.menuLink(t.goToNgoArea)).toHaveAttribute(
      'href',
      '/painel',
    );

    await navbar.menu.getByRole('button', { name: t.logout }).click();
    await page.waitForURL('**/entrar');
    expect(
      (await context.cookies()).some(({ name }) => name === 'ah_session'),
    ).toBe(false);

    const status = await gotoHydrated(page, '/');
    expect(await status.json()).toEqual({ loggedIn: false });
    await navbar.menuButton.click();
    await expect(navbar.menuLink(t.login)).toHaveAttribute('href', '/entrar');
  });
});
