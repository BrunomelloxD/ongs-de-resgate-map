import type { Page } from '@playwright/test';
import { dashboardDictionary as t } from '../../src/features/dashboard/dashboard.dictionary';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  goto() {
    return this.page.goto('/painel');
  }

  welcome(name: string) {
    return this.page.getByRole('heading', {
      name: t.firstAccess.title(name),
    });
  }

  get firstAnimalCta() {
    return this.page.getByRole('link', { name: t.firstAccess.cta });
  }

  checklistItem(label: string) {
    return this.page.getByRole('listitem').filter({ hasText: label });
  }

  get createLink() {
    return this.page.getByRole('link', { name: t.list.create, exact: true });
  }

  toggle(name: string) {
    return this.page.getByRole('switch', { name: t.row.toggle(name) });
  }

  /** Names shown in the list, in order. */
  rowNames() {
    return this.page.locator('[data-slot="animal-row"] h3').allTextContents();
  }

  get search() {
    return this.page.getByRole('searchbox', { name: t.list.search });
  }

  filter(name: keyof typeof t.list.filters) {
    return this.page.getByRole('button', { name: t.list.filters[name] });
  }

  /** The polite live region (A11Y-06); Next's route announcer is an alert. */
  get status() {
    return this.page.getByRole('status');
  }

  /** The visible message under the row (DASH-03); the live region repeats it. */
  get saveError() {
    return this.page
      .locator('[data-slot="animal-row"]')
      .getByText(t.row.saveError);
  }

  /** Fails the next Server Action posts: the toggle request never reaches the api. */
  failActions() {
    return this.page.route('**/painel', (route) =>
      route.request().method() === 'POST' &&
      route.request().headers()['next-action']
        ? route.fulfill({ status: 500, body: 'erro' })
        : route.continue(),
    );
  }

  restoreActions() {
    return this.page.unroute('**/painel');
  }

  get profileLink() {
    return this.page.getByRole('link', { name: t.header.profile });
  }

  /** T184: on the phone "Perfil da ONG" and "Sair" live in the ≡ menu. */
  async openMenu() {
    const menu = this.page.getByRole('button', { name: t.header.openMenu });
    if (await menu.isVisible()) await menu.click();
  }

  async logout() {
    await this.openMenu();
    await this.page.getByRole('button', { name: t.header.logout }).click();
  }
}
