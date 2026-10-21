import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { ngoAccountDictionary } from '../src/features/ngo-account/ngo-account.dictionary';
import { signupDictionary as t } from '../src/features/signup/signup.dictionary';
import { seriousAxeViolations } from './axe';
import { DashboardPage } from './pages/dashboard.page';
import { SignupPage } from './pages/signup.page';
import {
  createNgo,
  deleteNgo,
  newTestIp,
  withCheckDigits,
  type TestNgo,
} from './support/stack';

const a = ngoAccountDictionary.address;

// SIGN Independent Test: the journey runs on a 390 px phone.
test.use({ viewport: { width: 390, height: 844 } });

// Manaus, far from the seeds, so the map journeys don't see these NGOs.
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
const CEP_NOT_FOUND = {
  ok: false as const,
  error: 'CEP não encontrado. Confira os números ou busque pela cidade.',
};

const created: TestNgo[] = [];
let taken: TestNgo;

test.beforeAll(async () => {
  taken = await createNgo(newTestIp());
});

test.afterAll(async () => {
  for (const ngo of [taken, ...created]) await deleteNgo(ngo);
});

const id = () => randomBytes(4).toString('hex');
const digits = (n: number) =>
  Array.from(randomBytes(n), (b) => String(b % 10)).join('');
/** A valid CNPJ with digits only, typed without the mask. */
const numericCnpj = () => withCheckDigits(digits(12));

function newNgo() {
  const key = id();
  return {
    about: {
      cnpj: numericCnpj(),
      legalName: `e2e-web-signup ${key}`,
      description: 'ONG criada pelo e2e do cadastro do web, apagada no fim.',
    },
    contact: {
      email: `e2e-web-signup-${key}@example.com`,
      whatsapp: '92987654321',
      password: 'senha1234',
    },
    slug: `e2e-web-signup-${key}`,
  };
}

/** The web reads the visitor IP from x-forwarded-for: a fresh one keeps DEMO-08 out of the way. */
async function openSignup(page: Page) {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': newTestIp() });
  const signup = new SignupPage(page);
  await signup.stubTiles();
  return signup;
}

async function reachAddress(signup: SignupPage, page: Page) {
  const ngo = newNgo();
  await signup.goto();
  await signup.fillAbout(ngo.about);
  await signup.press(t.about.submit);
  await page.waitForURL('**/cadastro/contato');
  await signup.fillContact(ngo.contact);
  await signup.press(t.contact.submit);
  await page.waitForURL('**/cadastro/endereco');
  return ngo;
}

test('SIGN-01/02/28/DEMO-03: cadastro completo com CNPJ numérico, voltando para conferir os dados', async ({
  page,
  context,
}) => {
  const signup = await openSignup(page);
  await signup.stubAddressServices(MANAUS_CEP, FOUND);
  const ngo = newNgo();

  await signup.goto();
  await expect(signup.stepIndicator).toHaveAttribute(
    'aria-valuetext',
    'Etapa 1 de 5: Sobre a ONG',
  );
  expect(await seriousAxeViolations(page)).toEqual([]);
  await signup.fillAbout(ngo.about);
  await expect(signup.field(t.about.cnpj)).toHaveValue(
    ngo.about.cnpj.replace(/^(..)(...)(...)(....)(..)$/, '$1.$2.$3/$4-$5'),
  );
  await signup.press(t.about.submit);

  await page.waitForURL('**/cadastro/contato');
  await expect(signup.stepIndicator).toHaveAttribute(
    'aria-valuetext',
    'Etapa 2 de 5: Contato e acesso',
  );
  await signup.fillContact(ngo.contact);
  expect(await seriousAxeViolations(page)).toEqual([]);
  await signup.press(t.contact.submit);

  await page.waitForURL('**/cadastro/endereco');
  await signup.cepField.fill('69005070');
  await expect(signup.field(a.street)).toHaveValue('Avenida Eduardo Ribeiro');
  await expect(signup.field(a.city)).toHaveValue('Manaus');
  await expect(signup.field(a.uf)).toHaveValue('AM');
  await signup.numberField.fill('100');
  await signup.numberField.blur();
  await expect(signup.pin).toBeVisible();
  await signup.confirmLocation.press('Enter');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await signup.press(t.address.submit);

  await page.waitForURL('**/cadastro/horario');
  await expect(signup.heading(t.hours.title)).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  // SIGN-02: back two steps, everything is still there.
  await signup.press(t.hours.back);
  await page.waitForURL('**/cadastro/endereco');
  await expect(signup.cepField).toHaveValue('69005-070');
  await expect(signup.numberField).toHaveValue('100');
  await expect(signup.pin).toBeVisible();
  await signup.press(t.address.back);
  await page.waitForURL('**/cadastro/contato');
  await expect(signup.field(t.contact.email)).toHaveValue(ngo.contact.email);
  await expect(signup.field(t.contact.whatsapp)).toHaveValue('(92) 98765-4321');
  await expect(signup.field(t.contact.password)).toHaveValue('senha1234');
  await signup.press(t.contact.back);
  await page.waitForURL('**/cadastro/sobre');
  await expect(signup.field(t.about.legalName)).toHaveValue(
    ngo.about.legalName,
  );

  await signup.press(t.about.submit);
  await page.waitForURL('**/cadastro/contato');
  await signup.press(t.contact.submit);
  await page.waitForURL('**/cadastro/endereco');
  await signup.press(t.address.submit);
  await page.waitForURL('**/cadastro/horario');
  await signup.press(t.hours.submit);

  await page.waitForURL('**/cadastro/revisao');
  await expect(page.getByText(ngo.contact.email)).toBeVisible();
  const create = signup.button(t.review.submit);
  await expect(create).toBeDisabled();
  await signup
    .checkbox(
      `${t.review.termsBefore}${t.review.terms}${t.review.termsBetween}${t.review.privacy}${t.review.termsAfter}`,
    )
    .check();
  await expect(create).toBeDisabled();
  await signup.checkbox(t.review.demo(7)).check();
  expect(await seriousAxeViolations(page)).toEqual([]);
  created.push({ email: ngo.contact.email, password: ngo.contact.password });
  await create.press('Enter');

  await page.waitForURL('**/painel');
  const cookie = (await context.cookies()).find((c) => c.name === 'ah_session');
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' });

  await page.goto(`/ong/${ngo.slug}`);
  await expect(
    page.getByRole('heading', { level: 1, name: ngo.about.legalName }),
  ).toBeVisible();

  // DASH-07: the new NGO lands on the first access state.
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await expect(dashboard.welcome(ngo.about.legalName)).toBeVisible();
  await expect(dashboard.firstAnimalCta).toHaveAttribute(
    'href',
    '/painel/animais/novo',
  );
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('SIGN-03/04: CNPJ alfanumérico válido avança; inválido bloqueia com a mensagem', async ({
  page,
}) => {
  const signup = await openSignup(page);
  const ngo = newNgo();
  await signup.goto();

  await signup.fillAbout({ ...ngo.about, cnpj: '12ABC34501DE34' });
  await signup.press(t.about.submit);
  await expect(signup.errorSummary(t.validation.cnpjInvalid)).toBeVisible();
  await expect(signup.field(t.about.cnpj)).toHaveValue('12.ABC.345/01DE-34');
  await expect(page).toHaveURL(/\/cadastro\/sobre$/);
  expect(await seriousAxeViolations(page)).toEqual([]);

  const alphanumeric = withCheckDigits(`AB${digits(10)}`);
  await signup.field(t.about.cnpj).fill(alphanumeric);
  await signup.press(t.about.submit);
  await page.waitForURL('**/cadastro/contato');
});

test('SIGN-05/SIGN-12: CNPJ e e-mail já cadastrados bloqueiam, com os atalhos do e-mail', async ({
  page,
}) => {
  const signup = await openSignup(page);
  const ngo = newNgo();
  await signup.goto();

  await signup.fillAbout({ ...ngo.about, cnpj: taken.cnpj! });
  await signup.press(t.about.submit);
  await expect(signup.errorSummary(t.availability.cnpjTaken)).toBeVisible();
  await expect(page).toHaveURL(/\/cadastro\/sobre$/);

  await signup.field(t.about.cnpj).fill(ngo.about.cnpj);
  await signup.press(t.about.submit);
  await page.waitForURL('**/cadastro/contato');
  await signup.fillContact({ ...ngo.contact, email: taken.email });
  await signup.press(t.contact.submit);

  await expect(signup.errorSummary(t.availability.emailTaken)).toBeVisible();
  await expect(
    page.getByRole('link', { name: t.contact.loginWithEmail }),
  ).toHaveAttribute('href', `/entrar?email=${encodeURIComponent(taken.email)}`);
  await expect(
    page.getByRole('link', { name: t.contact.recoverPassword }),
  ).toHaveAttribute('href', '/recuperar-senha');
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('SIGN-18: CEP inexistente libera todos os campos com o aviso', async ({
  page,
}) => {
  const signup = await openSignup(page);
  await signup.stubAddressServices(CEP_NOT_FOUND, FOUND);
  await reachAddress(signup, page);

  await expect(signup.field(a.street)).toHaveAttribute('readonly', '');
  await signup.cepField.fill('99999999');

  await expect(page.getByText(a.cepFailed)).toBeVisible();
  await expect(signup.field(a.street)).not.toHaveAttribute('readonly');
  await expect(signup.field(a.uf)).toBeEnabled();
  await signup.field(a.street).fill('Rua Manual');
  await signup.numberField.fill('10');
  await signup.field(a.district).fill('Centro');
  await signup.field(a.city).fill('Manaus');
  await signup.field(a.uf).selectOption('AM');
  await expect(signup.pin).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('SIGN-22: sem "Confirmar localização" a etapa Endereço não avança', async ({
  page,
}) => {
  const signup = await openSignup(page);
  await signup.stubAddressServices(MANAUS_CEP, FOUND);
  await reachAddress(signup, page);

  await signup.cepField.fill('69005070');
  await signup.numberField.fill('100');
  await signup.numberField.blur();
  await expect(signup.pin).toBeVisible();
  await signup.press(t.address.submit);

  await expect(
    signup.errorSummary(t.validation.locationNotConfirmed),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/cadastro\/endereco$/);

  await signup.confirmLocation.press('Enter');
  await signup.press(t.address.submit);
  await page.waitForURL('**/cadastro/horario');
});

test('SIGN-01: abrir a revisão direto volta para a primeira etapa pendente; etapa inexistente é 404', async ({
  page,
}) => {
  await openSignup(page);

  await page.goto('/cadastro/revisao');
  await page.waitForURL('**/cadastro/sobre');

  const response = await page.goto('/cadastro/xyz');
  expect(response?.status()).toBe(404);
});
