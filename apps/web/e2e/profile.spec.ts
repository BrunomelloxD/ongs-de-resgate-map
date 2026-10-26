import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { homeDictionary as h } from '../src/features/home/home.dictionary';
import { ngoAccountDictionary as t } from '../src/features/ngo-account/ngo-account.dictionary';
import { seriousAxeViolations } from './axe';
import { LoginPage } from './pages/auth.page';
import { ProfilePage } from './pages/profile.page';
import {
  bucketKeys,
  createAnimals,
  createNgo,
  deleteNgo,
  newTestIp,
  ngoIdentity,
  type TestNgo,
} from './support/stack';

// PROF Independent Test.
test.use({ extraHTTPHeaders: { 'x-forwarded-for': newTestIp() } });

const FIXTURES = new URL('../../api/test/fixtures/', import.meta.url);
const NEW_PASSWORD = 'novaSenha2026';

let ngo: TestNgo & { legalName: string };
let deleted = false;

test.beforeAll(async () => {
  ngo = await createNgo(newTestIp(), 'e2e-web-prof');
  await createAnimals(ngo, [{ name: 'Pipoca', species: 'DOG', sex: 'MALE' }]);
});

test.afterAll(async () => {
  if (deleted) return;
  // The password may already be the new one.
  await deleteNgo({ ...ngo, password: NEW_PASSWORD }).catch(() =>
    deleteNgo(ngo),
  );
});

async function login(page: import('@playwright/test').Page, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(ngo.email, password);
  await page.waitForURL('**/painel');
}

test('PROF-01 a 08: editar dados e endereço, trocar a senha com outra sessão aberta e excluir a conta', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const { id, slug } = await ngoIdentity(ngo);
  const profile = new ProfilePage(page);
  await profile.stubTiles();
  await profile.stubGeocoding({ found: true, lat: -3.1301, lng: -60.0211 });

  await login(page, ngo.password);
  await profile.goto();

  // PROF-01: everything editable, but the CNPJ.
  await expect(profile.field(t.profile.cnpj)).toHaveAttribute('readonly');
  await expect(profile.field(t.profile.legalName)).toHaveValue(ngo.legalName);
  await expect(profile.field(t.profile.legalName)).toBeEditable();
  await expect(
    page.getByText(
      /^Seus dados serão apagados em \d{2}\/\d{2}\/\d{4} — faltam \d+ dias?$/,
    ),
  ).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  // SIGN-09 on the profile: the NGO image goes to the bucket.
  await profile.imageInput.setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: readFileSync(new URL('photo.png', FIXTURES)),
  });
  await expect(profile.status(t.profile.imageUploaded)).toBeVisible();

  // PROF-03: a new number asks for the pin again before saving.
  await profile
    .field(t.profile.description)
    .fill('Descrição nova do e2e do perfil, com mais de trinta letras.');
  await profile.field(t.address.number).fill('250');
  await profile.save();
  await expect(
    profile.errorSummary(t.profile.locationNotConfirmed),
  ).toBeVisible();
  await profile.field(t.address.number).blur();
  await profile.confirmLocation.press('Enter');
  await profile.save();
  // PROF-04.
  await expect(profile.status(t.profile.saved)).toBeVisible();
  await page.reload();
  await expect(profile.field(t.address.number)).toHaveValue('250');
  await expect(profile.field(t.profile.description)).toHaveValue(
    'Descrição nova do e2e do perfil, com mais de trinta letras.',
  );

  // PROF-05: another session is open while the password changes.
  const other = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': newTestIp() },
  });
  const otherPage = await other.newPage();
  await login(otherPage, ngo.password);

  // PROF-06 first: a wrong current password.
  await profile.changePassword('errada123', NEW_PASSWORD);
  await expect(
    page.getByText(t.password.wrongCurrent, { exact: true }).first(),
  ).toBeVisible();
  await profile.changePassword(ngo.password, NEW_PASSWORD);
  await expect(profile.status(t.password.changed)).toBeVisible();

  // The other session falls back to the login; this one keeps going.
  await otherPage.goto('/painel');
  await otherPage.waitForURL('**/entrar');
  await other.close();
  await page.reload();
  await expect(profile.field(t.profile.legalName)).toHaveValue(ngo.legalName);
  expect(await seriousAxeViolations(page)).toEqual([]);

  // PROF-07/08: the dialog explains, asks the password and deletes everything.
  const prefix = `ngos/${id}/`;
  expect(bucketKeys(prefix).length).toBeGreaterThan(0);
  await profile.openDeleteDialog();
  for (const item of t.deleteAccount.items) {
    await expect(profile.dialog.getByText(item)).toBeVisible();
  }
  expect(await seriousAxeViolations(page)).toEqual([]);
  await profile.confirmDelete(ngo.password);
  await expect(profile.dialog.getByText(t.password.wrongCurrent)).toBeVisible();
  await profile.dialog.getByLabel(t.deleteAccount.password).clear();
  await profile.confirmDelete(NEW_PASSWORD);

  await page.waitForURL('**/?conta=excluida');
  deleted = true;
  await expect(
    page.getByRole('status').filter({ hasText: h.accountDeleted }),
  ).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  const gone = await page.goto(`/ong/${slug}`);
  expect(gone?.status()).toBe(404);
  expect(bucketKeys(prefix)).toEqual([]);
  // No NGO left in the database to log in to.
  await expect(ngoIdentity({ ...ngo, password: NEW_PASSWORD })).rejects.toThrow(
    /^POST \/auth\/sessions: 40\d$/,
  );
});
