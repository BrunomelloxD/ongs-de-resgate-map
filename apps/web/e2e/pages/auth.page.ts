import type { Page } from '@playwright/test';
import { authDictionary as t } from '../../src/features/auth/auth.dictionary';

export class LoginPage {
  constructor(private readonly page: Page) {}

  goto() {
    return this.page.goto('/entrar');
  }

  get emailField() {
    return this.page.getByLabel(t.fields.email);
  }

  get passwordField() {
    return this.page.getByLabel(t.fields.password, { exact: true });
  }

  get forgotLink() {
    return this.page.getByRole('link', { name: t.login.forgot });
  }

  get signupLink() {
    return this.page.getByRole('link', { name: t.login.signup });
  }

  async login(email: string, password: string) {
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.page.getByRole('button', { name: t.login.submit }).click();
  }

  /** The error summary; Next's route announcer is an alert too, so it's a region here. */
  errorSummary(message: string) {
    return this.page
      .getByRole('region', { name: t.errorSummaryTitle })
      .getByRole('link', { name: message });
  }

  get passwordChangedNotice() {
    return this.page.getByRole('status').filter({
      hasText: t.login.passwordChanged,
    });
  }
}

export class ForgotPasswordPage {
  constructor(private readonly page: Page) {}

  goto() {
    return this.page.goto('/recuperar-senha');
  }

  async request(email: string) {
    await this.page.getByLabel(t.fields.email).fill(email);
    await this.page.getByRole('button', { name: t.forgot.submit }).click();
  }

  get sentHeading() {
    return this.page.getByRole('heading', { name: t.forgot.sentTitle });
  }

  get sentMessage() {
    return this.page.getByText(t.forgot.sent).first();
  }

  get resendButton() {
    return this.page.getByRole('button', { name: /^Reenviar/ });
  }
}

export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  goto(path: string) {
    return this.page.goto(path);
  }

  async save(password: string) {
    await this.page
      .getByLabel(t.reset.password, { exact: true })
      .fill(password);
    await this.page.getByLabel(t.reset.confirmation).fill(password);
    await this.page.getByRole('button', { name: t.reset.submit }).click();
  }

  get linkGoneHeading() {
    return this.page.getByRole('heading', { name: t.reset.linkGone });
  }

  get requestAnotherLink() {
    return this.page.getByRole('link', { name: t.reset.requestAnother });
  }
}
