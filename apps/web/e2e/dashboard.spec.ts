import { expect, test } from '@playwright/test';
import { dashboardDictionary as t } from '../src/features/dashboard/dashboard.dictionary';
import { seriousAxeViolations } from './axe';
import { LoginPage } from './pages/auth.page';
import { DashboardPage } from './pages/dashboard.page';
import {
  createAnimals,
  createNgo,
  deleteNgo,
  newTestIp,
  type TestNgo,
} from './support/stack';

// DASH Independent Test, on a phone.
test.use({
  viewport: { width: 390, height: 844 },
  extraHTTPHeaders: { 'x-forwarded-for': newTestIp() },
});

let ngo: TestNgo & { legalName: string };
let gone: (TestNgo & { legalName: string }) | undefined;

test.beforeAll(async () => {
  ngo = await createNgo(newTestIp(), 'e2e-web-dash');
});

test.afterAll(async () => {
  await deleteNgo(ngo);
  // The edge test deletes its own NGO; this only cleans up if it failed early.
  if (gone) await deleteNgo(gone).catch(() => undefined);
});

test('DASH-01 a 07/AUTH-05/07: primeiro acesso, toggle com sucesso e falha, busca, filtro e sair', async ({
  page,
}) => {
  const login = new LoginPage(page);
  const dashboard = new DashboardPage(page);

  await login.goto();
  await login.login(ngo.email, ngo.password);
  await page.waitForURL('**/painel');

  // DASH-07: a new NGO, without image or animals.
  await expect(dashboard.welcome(ngo.legalName)).toBeVisible();
  await expect(dashboard.firstAnimalCta).toHaveAttribute(
    'href',
    '/painel/animais/novo',
  );
  await expect(
    dashboard.checklistItem(t.firstAccess.items.image),
  ).toHaveAttribute('data-done', 'false');
  await expect(
    dashboard.checklistItem(t.firstAccess.items.hours),
  ).toHaveAttribute('data-done', 'true');
  await expect(
    dashboard.checklistItem(t.firstAccess.items.firstAnimal),
  ).toHaveAttribute('data-done', 'false');
  // DEMO-06 (the Compose stack runs with the demo on).
  await expect(
    page.getByText(
      /^Seus dados serão apagados em \d{2}\/\d{2}\/\d{4} — faltam \d+ dias$/,
    ),
  ).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  await createAnimals(ngo, [
    { name: 'João', species: 'DOG', sex: 'MALE' },
    { name: 'Mimi', species: 'CAT', sex: 'FEMALE' },
  ]);
  await dashboard.goto();

  // DASH-01/06
  await expect(dashboard.createLink).toHaveAttribute(
    'href',
    '/painel/animais/novo',
  );
  expect(await dashboard.rowNames()).toEqual(['Mimi', 'João']);
  await expect(dashboard.toggle('João')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(await seriousAxeViolations(page)).toEqual([]);

  // DASH-02: saved right away, announced, and still off after a reload.
  await dashboard.toggle('João').click();
  await expect(dashboard.status).toHaveText('João agora está indisponível.');
  await expect(dashboard.toggle('João')).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await dashboard.goto();
  await expect(dashboard.toggle('João')).toHaveAttribute(
    'aria-checked',
    'false',
  );

  // DASH-03: the request fails, the switch goes back.
  await dashboard.failActions();
  await dashboard.toggle('Mimi').click();
  await expect(dashboard.saveError).toBeVisible();
  await expect(dashboard.status).toHaveText(t.row.saveError);
  await expect(dashboard.toggle('Mimi')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await dashboard.restoreActions();
  expect(await seriousAxeViolations(page)).toEqual([]);

  // DASH-04: accents and case are ignored.
  await dashboard.search.fill('joao');
  await expect.poll(() => dashboard.rowNames()).toEqual(['João']);
  await dashboard.search.fill('');

  // DASH-05
  await dashboard.filter('cats').click();
  await expect.poll(() => dashboard.rowNames()).toEqual(['Mimi']);
  await dashboard.filter('unavailable').click();
  await expect.poll(() => dashboard.rowNames()).toEqual(['João']);

  // AUTH-05 / AUTH-07: out, and the dashboard is closed.
  await dashboard.logout();
  await page.waitForURL('**/entrar');
  await dashboard.goto();
  await expect(page).toHaveURL(/\/entrar$/);
});

test('AUTH-07 (borda): a ONG apagada com a sessão aberta volta para /entrar', async ({
  page,
}) => {
  gone = await createNgo(newTestIp(), 'e2e-web-dash');
  const login = new LoginPage(page);
  await login.goto();
  await login.login(gone.email, gone.password);
  await page.waitForURL('**/painel');
  await expect(new DashboardPage(page).welcome(gone.legalName)).toBeVisible();

  // Same effect as the cleanup job: the NGO and its sessions are gone.
  await deleteNgo(gone);
  await page.reload();

  await expect(page).toHaveURL(/\/entrar$/);
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'ah_session')).toBeUndefined();
});
