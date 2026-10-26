import type { Page } from '@playwright/test';
import { homeDictionary as t } from '../../src/features/home/home.dictionary';

export class HomePage {
  constructor(private readonly page: Page) {}

  goto() {
    return this.page.goto('/');
  }

  get findNgosLink() {
    return this.page.getByRole('link', { name: t.cta });
  }

  get title() {
    return this.page.getByRole('heading', { level: 1, name: t.title });
  }

  /** The figcraft 01 photos (T185), decorative. */
  get heroPhotos() {
    return this.page.locator('[data-slot="hero-art"] [data-slot="pin-photo"]');
  }

  get howItWorks() {
    return this.page.getByRole('region', { name: t.howItWorks.title });
  }

  get forNgos() {
    return this.page.getByRole('region', { name: t.forNgos.title });
  }

  get ngoLink() {
    return this.page.getByRole('link', { name: t.ngoLink });
  }
}
