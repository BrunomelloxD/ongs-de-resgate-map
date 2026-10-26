import { expect, test, type Page } from '@playwright/test';
import { SHARE_TEXT } from '../src/components/ui/ui.dictionary';
import { animalFormDictionary } from '../src/features/animal-form/animal-form.dictionary';
import { ngoAccountDictionary } from '../src/features/ngo-account/ngo-account.dictionary';
import { signupDictionary } from '../src/features/signup/signup.dictionary';
import { seriousAxeViolations } from './axe';
import { LoginPage } from './pages/auth.page';
import { NgoPage } from './pages/ngo.page';
import { ProfilePage } from './pages/profile.page';
import { UnsavedDialog } from './pages/unsaved.page';
import { createNgo, deleteNgo, newTestIp, type TestNgo } from './support/stack';

// SHARE and DIRTY Independent Tests, on desktop Chromium (no Web Share).
test.use({ extraHTTPHeaders: { 'x-forwarded-for': newTestIp() } });

const profileText = ngoAccountDictionary.profile;

let ngo: TestNgo & { legalName: string };

test.beforeAll(async () => {
  ngo = await createNgo(newTestIp(), 'e2e-web-dirty');
});

test.afterAll(async () => {
  await deleteNgo(ngo);
});

async function login(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(ngo.email, ngo.password);
  await page.waitForURL('**/painel');
}

test('SHARE-02: sem Web Share, "Compartilhar" copia a URL canônica e mostra "Link copiado."', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const ngoPage = new NgoPage(page);
  await ngoPage.goto('patas-do-bairro');
  expect(await page.evaluate(() => 'share' in navigator)).toBe(false);
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute('href');

  await page.getByRole('button', { name: SHARE_TEXT.label }).click();

  await expect(
    // T189 (C-25): "Compartilhar" floats on the cover now.
    page.locator('[data-slot="ngo-cover"]').getByText(SHARE_TEXT.copied),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    canonical,
  );
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('SHARE-02: o detalhe do animal também copia a própria URL canônica', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const ngoPage = new NgoPage(page);
  await ngoPage.goto('patas-do-bairro');
  await ngoPage.animal('Caramelo').click();
  await page.waitForURL('**/ong/patas-do-bairro/animais/*');
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute('href');

  await page.getByRole('button', { name: SHARE_TEXT.label }).click();

  await expect(
    page.locator('[data-slot="animal-detail"]').getByText(SHARE_TEXT.copied),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    canonical,
  );
});

test('DIRTY-01/02: no perfil, editar e sair pelo link, pelo "Voltar" e recarregando pede confirmação', async ({
  page,
}) => {
  const profile = new ProfilePage(page);
  const unsaved = new UnsavedDialog(page);
  await profile.stubTiles();
  await login(page);
  await profile.goto();
  // Typing before hydration would be lost.
  await page.waitForLoadState('networkidle');
  await profile
    .field(profileText.description)
    .fill('Descrição editada no e2e de alterações não salvas, sem salvar.');

  // "Voltar para o painel": "Continuar editando" stays with the text.
  const back = page.getByRole('link', { name: ngoAccountDictionary.page.back });
  await back.click();
  await expect(unsaved.dialog).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);
  await unsaved.stay();
  await expect(unsaved.dialog).toBeHidden();
  await expect(page).toHaveURL(/\/painel\/perfil$/);
  await expect(profile.field(profileText.description)).toHaveValue(
    'Descrição editada no e2e de alterações não salvas, sem salvar.',
  );

  // The demo banner, outside the form, asks too.
  await page.getByRole('link', { name: /^Demonstração:/ }).click();
  await expect(unsaved.dialog).toBeVisible();
  await unsaved.stay();

  // Reloading triggers the native beforeunload (DIRTY-02).
  const prompts = unsaved.recordBeforeUnload();
  await page.reload();
  await expect.poll(() => prompts).toEqual(['beforeunload']);

  // "Sair" leaves.
  await page.waitForLoadState('networkidle');
  await profile
    .field(profileText.description)
    .fill('Outra edição sem salvar no e2e.');
  await back.click();
  await unsaved.leave();
  await page.waitForURL(/\/painel$/);
});

test('DIRTY-01: no formulário de animal, "Voltar para seus animais" com um nome digitado pergunta; "Sair" volta ao painel', async ({
  page,
}) => {
  const unsaved = new UnsavedDialog(page);
  await login(page);
  await page.goto('/painel/animais/novo');
  await page.waitForLoadState('networkidle');
  await page
    .getByLabel(animalFormDictionary.form.name, { exact: true })
    .fill('Pipoca');

  await page
    .getByRole('link', { name: animalFormDictionary.page.back })
    .click();
  await expect(unsaved.dialog).toBeVisible();
  await unsaved.leave();
  await page.waitForURL(/\/painel$/);
});

test('DIRTY-01: no cadastro, sair da primeira etapa com dados pergunta, também depois de recarregar', async ({
  page,
}) => {
  const unsaved = new UnsavedDialog(page);
  // T172: from 1024 px the AuthShell panel replaces the back arrow; it stays on the phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cadastro/sobre');
  await page.waitForLoadState('networkidle');
  await page
    .getByLabel(signupDictionary.about.legalName, { exact: true })
    .fill('ONG do e2e de alterações');

  await page.getByRole('link', { name: signupDictionary.page.back }).click();
  await expect(unsaved.dialog).toBeVisible();
  await unsaved.stay();
  await expect(page).toHaveURL(/\/cadastro\/sobre$/);

  const prompts = unsaved.recordBeforeUnload();
  await page.reload();
  await expect.poll(() => prompts).toEqual(['beforeunload']);
  // The draft survives the reload (sessionStorage), so it still asks.
  await expect(
    page.getByLabel(signupDictionary.about.legalName, { exact: true }),
  ).toHaveValue('ONG do e2e de alterações');

  await page.getByRole('link', { name: signupDictionary.page.back }).click();
  await unsaved.leave();
  await page.waitForURL((url) => url.pathname === '/');
});

test('DIRTY-03: sem editar, o link, o "Voltar" e o recarregar não perguntam', async ({
  page,
}) => {
  const profile = new ProfilePage(page);
  const unsaved = new UnsavedDialog(page);
  await profile.stubTiles();
  await login(page);
  await profile.goto();
  await expect(profile.field(profileText.legalName)).toHaveValue(ngo.legalName);

  const prompts = unsaved.recordBeforeUnload();
  await page.reload();
  await expect(profile.field(profileText.legalName)).toHaveValue(ngo.legalName);

  await page
    .getByRole('link', { name: ngoAccountDictionary.page.back })
    .click();
  await page.waitForURL(/\/painel$/);

  await page.goto('/painel/animais/novo');
  await page
    .getByRole('link', { name: animalFormDictionary.page.back })
    .click();
  await page.waitForURL(/\/painel$/);
  await expect(unsaved.dialog).toBeHidden();
  expect(prompts).toEqual([]);
});
