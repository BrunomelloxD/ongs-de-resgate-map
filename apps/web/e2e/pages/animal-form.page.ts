import { expect, type Page } from '@playwright/test';
import { animalFormDictionary as t } from '../../src/features/animal-form/animal-form.dictionary';

export class AnimalFormPage {
  constructor(private readonly page: Page) {}

  gotoNew() {
    return this.page.goto('/painel/animais/novo');
  }

  goto(id: string) {
    return this.page.goto(`/painel/animais/${id}`);
  }

  heading(name: string) {
    return this.page.getByRole('heading', { level: 1, name });
  }

  /** The hidden file input behind "Adicionar foto". */
  get fileInput() {
    return this.page.locator('input[type="file"]');
  }

  get addPhoto() {
    return this.page.getByRole('button', { name: t.photos.add });
  }

  photo(n: number, total: number) {
    return this.page.getByRole('group', { name: t.photos.position(n, total) });
  }

  /** Waits until no photo shows "Enviando…" (HEIC takes ~1 s on the api). */
  async waitUploads() {
    await expect(this.page.getByText(t.photos.uploading)).toHaveCount(0, {
      timeout: 30_000,
    });
  }

  /** Image id of a saved photo, from its 160 px preview URL. */
  async savedPhotoId(n: number, total: number) {
    const src = await this.photo(n, total).getByRole('img').getAttribute('src');
    return /images\/([0-9a-f-]{36})-160\.webp$/.exec(src ?? '')?.[1];
  }

  /** Keyboard only (AFORM-10, A11Y): focus the button and press Enter. */
  async pressInPhoto(n: number, total: number, name: string) {
    await this.photo(n, total).getByRole('button', { name }).focus();
    await this.page.keyboard.press('Enter');
  }

  get name() {
    return this.page.getByLabel(t.form.name);
  }

  get age() {
    return this.page.getByLabel(t.form.ageValue);
  }

  option(name: string) {
    return this.page.getByRole('radio', { name });
  }

  /** The radio is visually hidden: tap its chip, like the NGO does. */
  choose(name: string) {
    return this.page.locator('label', { has: this.option(name) }).click();
  }

  // T183: the button sits in the phone's fixed ActionBar, under Next's dev
  // indicator; Enter on it submits the same way and isn't blocked by the badge.
  submit(edit = false) {
    return this.page
      .getByRole('button', { name: edit ? t.form.update : t.form.create })
      .press('Enter');
  }

  /** The polite live region (A11Y-06); Next's route announcer is an alert. */
  get status() {
    return this.page.getByRole('status');
  }

  get deleteButton() {
    return this.page.getByRole('button', { name: t.delete.open, exact: true });
  }

  /** By keyboard: at 390 px the Next dev indicator covers the bottom of the page. */
  async press(locator: ReturnType<Page['getByRole']>) {
    await locator.focus();
    await this.page.keyboard.press('Enter');
  }

  dialog(name: string) {
    return this.page.getByRole('dialog', { name: t.delete.title(name) });
  }

  get notFound() {
    return this.page.getByRole('heading', { name: t.notFound.title });
  }
}
