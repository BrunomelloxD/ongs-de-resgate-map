import type { Page } from '@playwright/test';
import { UNSAVED_CHANGES_TEXT as t } from '../../src/components/ui/ui.dictionary';

/** The "Sair sem salvar?" dialog of the GuardedLinks (DIRTY-01). */
export class UnsavedDialog {
  constructor(private readonly page: Page) {}

  get dialog() {
    return this.page.getByRole('dialog', { name: t.title });
  }

  stay() {
    return this.dialog.getByRole('button', { name: t.stay }).press('Enter');
  }

  leave() {
    return this.dialog.getByRole('button', { name: t.leave }).press('Enter');
  }

  /** Records the native beforeunload prompts (DIRTY-02) and accepts them, so the reload goes on. */
  recordBeforeUnload() {
    const prompts: string[] = [];
    this.page.on('dialog', (dialog) => {
      prompts.push(dialog.type());
      void dialog.accept();
    });
    return prompts;
  }
}
