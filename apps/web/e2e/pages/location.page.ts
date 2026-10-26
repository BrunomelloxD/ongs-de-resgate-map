import type { Page } from '@playwright/test';
import { locationDictionary as t } from '../../src/features/location/location.dictionary';

// Kept in sessionStorage: going to /mapa may reload the page and the init script.
const CALLS_KEY = 'e2e-geolocation-calls';

export class LocationPage {
  constructor(private readonly page: Page) {}

  goto() {
    return this.page.goto('/localizacao');
  }

  /** Records each call and keeps the real behaviour, or answers TIMEOUT when asked. */
  spyOnGeolocation({ timeout = false } = {}) {
    return this.page.addInitScript(
      ({ key, answerTimeout }) => {
        const geolocation = navigator.geolocation;
        const real = geolocation.getCurrentPosition.bind(geolocation);
        geolocation.getCurrentPosition = (ok, fail, options) => {
          const calls = JSON.parse(sessionStorage.getItem(key) ?? '[]');
          calls.push({ timeout: options?.timeout });
          sessionStorage.setItem(key, JSON.stringify(calls));
          if (!answerTimeout) return real(ok, fail, options);
          fail?.({
            code: 3,
            message: 'Timeout expired',
          } as GeolocationPositionError);
        };
      },
      { key: CALLS_KEY, answerTimeout: timeout },
    );
  }

  /** `getCurrentPosition` calls, with the options each one got. */
  geolocationCalls(): Promise<{ timeout?: number }[]> {
    return this.page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key) ?? '[]'),
      CALLS_KEY,
    );
  }

  get useLocationButton() {
    return this.page.getByRole('button', { name: t.ask.useLocation });
  }

  get manualButton() {
    return this.page.getByRole('button', { name: t.ask.manual });
  }

  /** The picker's notice; Next's empty route announcer is an alert too. */
  get notice() {
    return this.page.getByRole('alert').filter({ hasText: /\S/ });
  }

  /** T186: one "Cidade ou CEP" field for both. */
  get cityField() {
    return this.page.getByRole('combobox', { name: t.city.labelWithCep });
  }

  cityOption(name: string) {
    return this.page.getByRole('option', { name });
  }

  get cepField() {
    return this.cityField;
  }

  async searchCep(cep: string) {
    await this.cepField.fill(cep);
    await this.page.getByRole('button', { name: t.manual.submit }).click();
  }
}
