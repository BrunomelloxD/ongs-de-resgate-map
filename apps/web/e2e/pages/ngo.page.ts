import type { Page } from '@playwright/test';
import { ngoPageDictionary as t } from '../../src/features/ngo-page/ngo-page.dictionary';

export class NgoPage {
  constructor(private readonly page: Page) {}

  goto(slug: string) {
    return this.page.goto(`/ong/${slug}`);
  }

  get whatsappLink() {
    return this.page
      .locator('[data-slot="ngo-profile"]')
      .getByRole('link', { name: t.profile.whatsapp });
  }

  get directionsLink() {
    return this.page.getByRole('link', {
      name: new RegExp(t.profile.directions),
    });
  }

  get today() {
    return this.page.locator('li[aria-current="date"]');
  }

  animal(name: string) {
    return this.page
      .locator('[data-slot="animal-card"]')
      .filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  get animalCards() {
    return this.page.locator('[data-slot="animal-card"]');
  }

  /** T189 (O-06): a toggle chip, pressed when on. */
  get onlyAvailable() {
    return this.page.getByRole('button', { name: t.animals.onlyAvailable });
  }

  /** T189 (O-06): species, sex and size are dropdown chips (native selects). */
  filter(name: string) {
    return this.page.getByRole('combobox', { name });
  }

  emptyNgoTitle(ngoName: string) {
    return this.page.getByRole('heading', {
      name: t.animals.emptyNgo.title(ngoName),
    });
  }

  get notFoundTitle() {
    return this.page.getByRole('heading', { name: t.notFound.title });
  }

  get mapLink() {
    return this.page.getByRole('link', { name: t.notFound.map });
  }
}
