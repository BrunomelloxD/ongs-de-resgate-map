import { expect, test } from '@playwright/test';
import { authDictionary as t } from '../src/features/auth/auth.dictionary';
import { seriousAxeViolations } from './axe';
import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
} from './pages/auth.page';
import {
  createNgo,
  deleteMailsTo,
  deleteNgo,
  expirePendingResets,
  latestResetPath,
  mailCount,
  newTestIp,
  type TestNgo,
} from './support/stack';

const NEW_PASSWORD = 'novaSenha99';
const NOBODY = `e2e-web-ninguem-${Date.now()}@example.com`;

// One NGO for the whole journey: the steps share its password and its links.
test.describe.configure({ mode: 'serial' });

// The web reads the visitor IP from x-forwarded-for: a fresh one per run keeps
// the login (AUTH-04) and reset (AUTH-11) limits from leaking between runs.
test.use({ extraHTTPHeaders: { 'x-forwarded-for': newTestIp() } });

let ngo: TestNgo;
let firstLink: string;

test.beforeAll(async () => {
  ngo = await createNgo(newTestIp());
});

test.afterAll(async () => {
  await deleteNgo(ngo);
  await deleteMailsTo(ngo.email);
});

test('AUTH-01/02: entra e grava o cookie ah_session com HttpOnly, Secure e SameSite=Lax', async ({
  page,
  context,
}) => {
  const login = new LoginPage(page);
  await login.goto();

  await expect(login.forgotLink).toHaveAttribute('href', '/recuperar-senha');
  await expect(login.signupLink).toHaveAttribute('href', '/cadastro/sobre');
  expect(await seriousAxeViolations(page)).toEqual([]);

  const before = Date.now() / 1000;
  await login.login(ngo.email, ngo.password);
  await page.waitForURL('**/painel');

  const cookie = (await context.cookies()).find((c) => c.name === 'ah_session');
  expect(cookie).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
  });
  // AUTH-02: 1 day (Max-Age=86400).
  expect(cookie!.expires - before).toBeGreaterThan(86400 - 60);
  expect(cookie!.expires - before).toBeLessThanOrEqual(86400 + 60);
});

test('AUTH-03/04: 5 erros mostram "E-mail ou senha incorretos." e a 6ª tentativa mostra o bloqueio', async ({
  page,
}) => {
  const login = new LoginPage(page);
  await login.goto();

  for (let attempt = 1; attempt <= 5; attempt++) {
    await login.login(ngo.email, `errada${attempt}`);
    await expect(login.errorSummary(t.login.invalid)).toBeVisible();
    await expect(login.emailField).toBeFocused();
  }
  expect(await seriousAxeViolations(page)).toEqual([]);

  await login.login(ngo.email, 'errada6');
  await expect(
    login.errorSummary('Muitas tentativas. Tente de novo em 15 minutos.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/entrar$/);
});

test('AUTH-08/10: e-mail inexistente recebe a mesma resposta e nenhum e-mail', async ({
  page,
}) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.goto();
  expect(await seriousAxeViolations(page)).toEqual([]);

  await forgot.request(NOBODY);

  await expect(forgot.sentHeading).toBeVisible();
  await expect(forgot.sentMessage).toHaveText(
    'Se houver uma conta com este e-mail, enviamos um link.',
  );
  await expect(forgot.resendButton).toBeDisabled();
  await expect(forgot.resendButton).toHaveText(/^Reenviar em 0:\d\d$/);
  expect(await mailCount(NOBODY)).toBe(0);
});

test('AUTH-08/09: e-mail existente recebe o link de recuperação no Mailpit', async ({
  page,
}) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.goto();

  await forgot.request(ngo.email);

  await expect(forgot.sentMessage).toHaveText(
    'Se houver uma conta com este e-mail, enviamos um link.',
  );
  expect(await seriousAxeViolations(page)).toEqual([]);
  // The api sends the e-mail without waiting for it (AUTH-08).
  await expect.poll(() => mailCount(ngo.email)).toBe(1);
  firstLink = await latestResetPath(ngo.email);
});

test('AUTH-12: o link troca a senha e abre /entrar com "Senha alterada. Entre com a nova senha."', async ({
  page,
}) => {
  const reset = new ResetPasswordPage(page);
  await reset.goto(firstLink);
  expect(await seriousAxeViolations(page)).toEqual([]);

  await reset.save(NEW_PASSWORD);

  await page.waitForURL('**/entrar?senha=alterada');
  await expect(new LoginPage(page).passwordChangedNotice).toBeVisible();
  ngo.password = NEW_PASSWORD;
});

test('AUTH-13: reusar o link mostra "Este link expirou ou já foi usado." e "Pedir outro link"', async ({
  page,
}) => {
  const reset = new ResetPasswordPage(page);
  await reset.goto(firstLink);

  await reset.save('outraSenha77');

  await expect(reset.linkGoneHeading).toHaveText(
    'Este link expirou ou já foi usado.',
  );
  await expect(reset.requestAnotherLink).toHaveAttribute(
    'href',
    '/recuperar-senha',
  );
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('AUTH-13: link vencido (mais de 1 hora) mostra "Este link expirou ou já foi usado."', async ({
  page,
}) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.goto();
  await forgot.request(ngo.email);
  await expect.poll(() => mailCount(ngo.email)).toBe(2);
  const secondLink = await latestResetPath(ngo.email);
  expect(secondLink).not.toBe(firstLink);
  expirePendingResets(ngo.email);

  const reset = new ResetPasswordPage(page);
  await reset.goto(secondLink);
  await reset.save('outraSenha77');

  await expect(reset.linkGoneHeading).toHaveText(
    'Este link expirou ou já foi usado.',
  );
  await reset.requestAnotherLink.click();
  await page.waitForURL('**/recuperar-senha');
});
