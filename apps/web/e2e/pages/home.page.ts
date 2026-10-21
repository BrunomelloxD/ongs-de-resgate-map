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

  get ngoLink() {
    return this.page.getByRole('link', { name: t.ngoLink });
  }
}
