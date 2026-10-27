import type { Page } from '@playwright/test';
import { NAVBAR_TEXT as t } from '../../src/components/ui/ui.dictionary';

/** T196: the public navbar and its phone menu. */
export class Navbar {
  constructor(private readonly page: Page) {}

  get bar() {
    return this.page.locator('[data-slot="navbar"]:visible');
  }

  get logo() {
    return this.bar.getByRole('link', { name: 'Animal Helper' });
  }

  /** The desktop links ("Mapa de ONGs", "Como funciona", "Para ONGs"). */
  link(name: string) {
    return this.bar
      .getByRole('navigation', { name: t.nav })
      .getByRole('link', { name });
  }

  get login() {
    return this.bar.getByRole('link', { name: t.login });
  }

  get signup() {
    return this.bar.getByRole('link', { name: t.signup });
  }

  /** Logged in: the pill on desktop, the avatar on the phone. */
  get ngoArea() {
    return this.bar.getByRole('link', { name: new RegExp(`^${t.ngoArea}`) });
  }

  get menuButton() {
    return this.bar.getByRole('button', { name: t.openMenu });
  }

  /** The same ≡ while the modal menu hides the rest of the page from the accessibility tree. */
  get menuTrigger() {
    return this.bar.locator(`button[aria-label="${t.openMenu}"]`);
  }

  get menu() {
    return this.page.getByRole('dialog', { name: t.menu });
  }

  menuLink(name: string) {
    return this.menu.getByRole('link', { name });
  }

  get skipLink() {
    return this.page.getByRole('link', { name: t.skip });
  }
}
