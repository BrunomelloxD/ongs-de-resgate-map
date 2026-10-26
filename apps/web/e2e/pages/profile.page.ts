import type { Page } from '@playwright/test';
import type { GeocodeResult } from '../../src/features/location/location.types';
import { ngoAccountDictionary } from '../../src/features/ngo-account/ngo-account.dictionary';

const t = ngoAccountDictionary;

// One beige pixel: the tests never fetch real tiles.
const TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN48+I+AAV3ArSJrfWSAAAAAElFTkSuQmCC',
  'base64',
);

export class ProfilePage {
  constructor(private readonly page: Page) {}

  goto() {
    return this.page.goto('/painel/perfil');
  }

  /** Answers every tile request with a local image. */
  stubTiles() {
    return this.page.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: TILE_PNG }),
    );
  }

  /**
   * The api geocodes through Nominatim, which the tests must not call. The
   * geocoding Server Action goes out with an empty address (answered without
   * the api) and its answer is swapped for `geocode`. Other actions pass.
   */
  async stubGeocoding(geocode: GeocodeResult) {
    const nowhere = JSON.stringify({ found: false, lat: null, lng: null });
    await this.page.route('**/painel/perfil', async (route) => {
      const request = route.request();
      let arg: unknown;
      try {
        [arg] = JSON.parse(request.postData() ?? '') as unknown[];
      } catch {
        return route.continue();
      }
      const isGeocode =
        request.method() === 'POST' &&
        Boolean(request.headers()['next-action']) &&
        typeof arg === 'object' &&
        arg !== null &&
        'street' in arg &&
        !('legalName' in arg);
      if (!isGeocode) return route.continue();
      const response = await route.fetch({ postData: JSON.stringify([{}]) });
      const body = await response.text();
      if (!body.includes(nowhere)) {
        throw new Error(`Unexpected Server Action answer: ${body}`);
      }
      await route.fulfill({
        response,
        body: body.replace(nowhere, JSON.stringify(geocode)),
      });
    });
  }

  field(label: string) {
    return this.page.getByLabel(label, { exact: true });
  }

  button(name: string) {
    return this.page.getByRole('button', { name, exact: true });
  }

  /** The error summary; Next's route announcer is an alert too, so it's a region here. */
  errorSummary(message: string) {
    return this.page
      .getByRole('region', { name: t.profile.errorSummaryTitle })
      .getByRole('link', { name: message });
  }

  status(text: string) {
    return this.page.getByRole('status').filter({ hasText: text });
  }

  get imageInput() {
    return this.page.locator('#profile-image');
  }

  get confirmLocation() {
    return this.button('Confirmar localização');
  }

  /** Keyboard: at 390 px the dev indicator of Next can cover a button. */
  save() {
    return this.button(t.profile.submit).press('Enter');
  }

  async changePassword(current: string, next: string) {
    await this.field(t.password.currentPassword).fill(current);
    await this.field(t.password.password).fill(next);
    await this.field(t.password.confirmation).fill(next);
    await this.button(t.password.submit).press('Enter');
  }

  get dialog() {
    return this.page.getByRole('dialog', { name: t.deleteAccount.title });
  }

  async openDeleteDialog() {
    await this.button(t.deleteAccount.open).press('Enter');
    await this.dialog.waitFor();
  }

  async confirmDelete(password: string) {
    await this.dialog.getByLabel(t.deleteAccount.password).fill(password);
    await this.dialog
      .getByRole('button', { name: t.deleteAccount.confirm })
      .press('Enter');
  }
}
