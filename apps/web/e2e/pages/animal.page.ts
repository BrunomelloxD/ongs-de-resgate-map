import type { Page } from '@playwright/test';
import { animalPageDictionary as t } from '../../src/features/animal-page/animal-page.dictionary';

export class AnimalPage {
  constructor(private readonly page: Page) {}

  adoptLink(name: string, sex: 'MALE' | 'FEMALE') {
    return this.page.getByRole('link', { name: t.detail.adopt(name, sex) });
  }

  adoptButton(name: string, sex: 'MALE' | 'FEMALE') {
    return this.page.getByRole('button', { name: t.detail.adopt(name, sex) });
  }

  unavailableText(name: string) {
    return this.page.getByText(t.detail.unavailable(name));
  }

  otherAnimalsLink(ngo: string) {
    return this.page.getByRole('link', { name: t.detail.otherAnimals(ngo) });
  }

  counter(text: string) {
    return this.page.getByText(text, { exact: true });
  }

  get notFoundTitle() {
    return this.page.getByRole('heading', { name: t.notFound.title });
  }

  get mapLink() {
    return this.page.getByRole('link', { name: t.notFound.map });
  }
}
