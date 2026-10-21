import type { Page } from '@playwright/test';
import { mapDictionary as t } from '../../src/features/map/map.dictionary';

// One beige pixel: the tests never fetch real tiles.
const TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN48+I+AAV3ArSJrfWSAAAAAElFTkSuQmCC',
  'base64',
);

export class MapPage {
  constructor(private readonly page: Page) {}

  /** Answers every tile request with a local image. */
  stubTiles() {
    return this.page.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: TILE_PNG }),
    );
  }

  /** MAP-16: the BFF answers 503. */
  failSearch() {
    return this.page.route('**/map/ngos?**', (route) =>
      route.fulfill({ status: 503 }),
    );
  }

  goto(center: { lat: number; lng: number }, radiusKm = 5) {
    return this.page.goto(`/mapa#c=${center.lat},${center.lng}&r=${radiusKm}`);
  }

  get map() {
    return this.page.getByRole('region', { name: t.mapLabel });
  }

  /** Drags the map from its center by (dx, dy) px, like a finger or a mouse. */
  async drag(dx: number, dy: number) {
    const box = (await this.map.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + dx, y + dy, { steps: 10 });
    await this.page.mouse.up();
  }

  get attribution() {
    return this.page.locator('.leaflet-control-attribution');
  }

  /** The list of NGOs; below 1024 px it sits in a collapsed bottom sheet. */
  get list() {
    return this.page
      .getByRole('list')
      .filter({ has: this.page.getByRole('button') });
  }

  get sheetHandle() {
    return this.page.getByRole('button', { name: t.list.label });
  }

  /** Opens the bottom sheet below 1024 px; from 1024 px the list is a side column. */
  async openSheet() {
    await this.map.waitFor();
    if ((await this.sheetHandle.count()) === 0) return;
    if ((await this.sheetHandle.getAttribute('aria-expanded')) === 'false') {
      await this.sheetHandle.click();
    }
  }

  listItem(name: string) {
    return this.list.getByRole('button', { name: new RegExp(name) });
  }

  /** A pin on the map; its label also says whether the NGO is open now. */
  pin(name: string) {
    return this.map.getByRole('button', { name: new RegExp(`^${name}, `) });
  }

  get previewLink() {
    return this.page.getByRole('link', { name: t.preview.cta });
  }

  get searchError() {
    return this.page.getByRole('alert').filter({ hasText: t.list.error.title });
  }

  get emptyTitle() {
    return this.page.getByRole('heading', { name: t.list.empty.title });
  }
}
