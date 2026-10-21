import type { Page } from '@playwright/test';
import { locationDictionary } from '../../src/features/location/location.dictionary';
import type {
  GeocodeResult,
  LookupCepResult,
} from '../../src/features/location/location.types';
import { ngoAccountDictionary } from '../../src/features/ngo-account/ngo-account.dictionary';
import { signupDictionary as t } from '../../src/features/signup/signup.dictionary';

const a = ngoAccountDictionary.address;

// One beige pixel: the tests never fetch real tiles.
const TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN48+I+AAV3ArSJrfWSAAAAAElFTkSuQmCC',
  'base64',
);

export interface AboutInput {
  cnpj: string;
  legalName: string;
  description: string;
}

export interface ContactInput {
  email: string;
  whatsapp: string;
  password: string;
}

export class SignupPage {
  constructor(private readonly page: Page) {}

  goto(slug = 'sobre') {
    return this.page.goto(`/cadastro/${slug}`);
  }

  /** Answers every tile request with a local image. */
  stubTiles() {
    return this.page.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: TILE_PNG }),
    );
  }

  /**
   * The api resolves a CEP through BrasilAPI/ViaCEP and geocodes through
   * Nominatim, which the tests must not call. So the address step's Server
   * Actions go out with inputs the actions answer without the api (a short CEP,
   * an empty address), and those answers are swapped for `cep` and `geocode`.
   */
  async stubAddressServices(cep: LookupCepResult, geocode: GeocodeResult) {
    const shortCep = JSON.stringify({
      ok: false,
      error: locationDictionary.cep.invalid,
    });
    const nowhere = JSON.stringify({ found: false, lat: null, lng: null });
    await this.page.route('**/cadastro/endereco', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST' || !request.headers()['next-action']) {
        return route.continue();
      }
      const [arg] = JSON.parse(request.postData() ?? '[]') as unknown[];
      const isCep = typeof arg === 'string';
      const response = await route.fetch({
        postData: JSON.stringify(isCep ? ['0'] : [{}]),
      });
      const body = await response.text();
      const local = isCep ? shortCep : nowhere;
      if (!body.includes(local)) {
        throw new Error(`Unexpected Server Action answer: ${body}`);
      }
      await route.fulfill({
        response,
        body: body.replace(local, JSON.stringify(isCep ? cep : geocode)),
      });
    });
  }

  get stepIndicator() {
    return this.page.getByRole('progressbar');
  }

  heading(name: string) {
    return this.page.getByRole('heading', { level: 1, name });
  }

  /** The error summary; Next's route announcer is an alert too, so it's a region here. */
  errorSummary(message: string) {
    return this.page
      .getByRole('region', { name: t.errorSummaryTitle })
      .getByRole('link', { name: message });
  }

  field(label: string) {
    return this.page.getByLabel(label, { exact: true });
  }

  button(name: string) {
    return this.page.getByRole('button', { name, exact: true });
  }

  /**
   * Activates a button from the keyboard. At 390 px the bottom buttons can sit
   * under the Next dev indicator, which would take a mouse click.
   */
  press(name: string) {
    return this.button(name).press('Enter');
  }

  async fillAbout(about: AboutInput) {
    await this.field(t.about.cnpj).fill(about.cnpj);
    await this.field(t.about.legalName).fill(about.legalName);
    await this.field(t.about.description).fill(about.description);
  }

  async fillContact(contact: ContactInput) {
    await this.field(t.contact.email).fill(contact.email);
    await this.field(t.contact.whatsapp).fill(contact.whatsapp);
    await this.field(t.contact.password).fill(contact.password);
    await this.field(t.contact.confirmation).fill(contact.password);
  }

  get cepField() {
    return this.field(a.cep);
  }

  get numberField() {
    return this.field(a.number);
  }

  get confirmLocation() {
    return this.button('Confirmar localização');
  }

  get pin() {
    return this.page.getByRole('button', {
      name: 'Pino da ONG, arraste até o local',
    });
  }

  checkbox(name: string) {
    return this.page.getByRole('checkbox', { name });
  }
}
