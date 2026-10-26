import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import { animalFormDictionary as t } from '../src/features/animal-form/animal-form.dictionary';
import { dashboardDictionary as d } from '../src/features/dashboard/dashboard.dictionary';
import { seriousAxeViolations } from './axe';
import { AnimalFormPage } from './pages/animal-form.page';
import { LoginPage } from './pages/auth.page';
import { DashboardPage } from './pages/dashboard.page';
import {
  bucketKeys,
  createAnimals,
  createNgo,
  deleteNgo,
  newTestIp,
  ngoIdentity,
  type TestNgo,
} from './support/stack';

// AFORM Independent Test, on a phone.
test.use({
  viewport: { width: 390, height: 844 },
  extraHTTPHeaders: { 'x-forwarded-for': newTestIp() },
});

const FIXTURES = new URL('../../api/test/fixtures/', import.meta.url);
const fixture = (name: string, mimeType: string) => ({
  name,
  mimeType,
  buffer: readFileSync(new URL(name, FIXTURES)),
});

/**
 * A real PNG just under 5 MB (MB = 1024²): random pixels, stored without
 * compression, so the request is close to the 6 MB `bodySizeLimit`.
 */
function pngNear5Mb() {
  const width = 1280;
  const height = 1360;
  const row = 1 + width * 3;
  const raw = randomBytes(row * height);
  for (let y = 0; y < height; y++) raw[y * row] = 0;
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const buffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 0 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return { name: 'grande.png', mimeType: 'image/png', buffer };
}

let ngo: TestNgo & { legalName: string };
let other: TestNgo & { legalName: string };
let otherAnimalId: string;

test.beforeAll(async () => {
  ngo = await createNgo(newTestIp(), 'e2e-web-aform');
  other = await createNgo(newTestIp(), 'e2e-web-aform');
  [otherAnimalId] = await createAnimals(other, [
    { name: 'Outro', species: 'CAT', sex: 'FEMALE' },
  ]);
});

test.afterAll(async () => {
  await deleteNgo(ngo);
  await deleteNgo(other);
});

test('AFORM-01 a 17: cadastrar com 3 fotos (uma HEIC), reordenar pelo teclado, trocar a capa, editar e excluir', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { id: ngoId, slug } = await ngoIdentity(ngo);
  const prefix = `ngos/${ngoId}/images/`;
  const form = new AnimalFormPage(page);
  const dashboard = new DashboardPage(page);

  await new LoginPage(page).goto();
  await new LoginPage(page).login(ngo.email, ngo.password);
  await page.waitForURL('**/painel');
  await dashboard.firstAnimalCta.click();
  await page.waitForURL('**/painel/animais/novo');
  await expect(form.heading(t.page.newTitle)).toBeVisible();
  // AFORM-06 and DEMO-06 (the Compose stack runs with the demo on).
  await expect(page.getByLabel(t.form.breed)).toHaveValue('SRD (vira-lata)');
  await expect(
    page
      .getByText(
        /^Seus dados serão apagados em \d{2}\/\d{2}\/\d{4} — faltam \d+ dias?$/,
      )
      // The hidden /painel (<Activity>) has its own notice.
      .filter({ visible: true }),
  ).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  // AFORM-05: no photo, no save.
  await form.submit();
  await expect(
    page.getByRole('link', { name: t.validation.photos }),
  ).toBeVisible();
  await expect(form.addPhoto).toBeFocused();

  // AFORM-08/09: PNG 800×600, HEIC 1600×1200 and WebP 900×1300 (the only portrait).
  await form.fileInput.setInputFiles([
    fixture('photo.png', 'image/png'),
    fixture('photo.heic', 'image/heic'),
    fixture('photo.webp', 'image/webp'),
  ]);
  await form.waitUploads();
  // AFORM-07: DEMO_MAX_IMAGES_PER_ANIMAL is 3 in the Compose stack.
  await expect(
    page.getByRole('heading', { name: t.photos.title(3, 3) }),
  ).toBeVisible();
  await expect(form.addPhoto).toBeDisabled();
  await expect(page.getByText(t.photos.retry)).toHaveCount(0);

  await form.name.fill('Bolinha e2e');
  await form.choose(t.form.speciesOptions.DOG);
  await form.choose(t.form.sexOptions.MALE);
  await form.choose(t.form.sizeOptions.MEDIUM);
  await form.age.fill('4');

  // AFORM-10 by keyboard: PNG to the right → [HEIC, PNG, WebP].
  await form.pressInPhoto(1, 3, t.photos.moveRight);
  await expect(form.status).toHaveText(t.photos.moved(2, 3));
  await expect(
    form.photo(2, 3).getByRole('button', { name: t.photos.moveRight }),
  ).toBeFocused();
  // AFORM-11: the WebP becomes the cover → [WebP, HEIC, PNG].
  await form.pressInPhoto(3, 3, t.photos.useAsCover);
  await expect(form.status).toHaveText(t.photos.madeCover);
  await expect(form.photo(1, 3).getByText(t.photos.cover)).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  await form.submit();
  await page.waitForURL('**/painel');
  await expect.poll(() => dashboard.rowNames()).toEqual(['Bolinha e2e']);
  // 3 photos × 3 variants (160, 600 and 1200, T174).
  expect(bucketKeys(prefix)).toHaveLength(9);

  // AFORM-01: available on the NGO page, with the chosen cover (the portrait WebP).
  await page.goto(`/ong/${slug}`);
  await page
    .getByRole('link', { name: /Bolinha e2e/ })
    .first()
    .click();
  await page.waitForURL(`**/ong/${slug}/animais/*`);
  const publicUrl = new URL(page.url()).pathname;
  const animalId = publicUrl.split('/').at(-1)!;
  const cover = page
    .getByRole('img', { name: 'Bolinha e2e, cão, porte médio' })
    .first();
  expect(Number(await cover.getAttribute('height'))).toBeGreaterThan(
    Number(await cover.getAttribute('width')),
  );

  // <Activity> on /painel: the filter is still on after going to the form and back.
  await dashboard.goto();
  await dashboard.filter('dogs').click();
  await expect(dashboard.filter('dogs')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('link', { name: d.row.edit('Bolinha e2e') }).click();
  await page.waitForURL(`**/painel/animais/${animalId}`);
  await expect(form.heading(t.page.editTitle('Bolinha e2e'))).toBeVisible();
  await page.goBack();
  await page.waitForURL('**/painel');
  await expect(dashboard.filter('dogs')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goForward();
  await page.waitForURL(`**/painel/animais/${animalId}`);

  // AFORM-13/14: new name, the last photo (PNG) out, a ~5 MB one in.
  await expect(form.name).toHaveValue('Bolinha e2e');
  const removed = await form.savedPhotoId(3, 3);
  expect(removed).toBeTruthy();
  await form.photo(3, 3).getByRole('button', { name: t.photos.remove }).click();
  const big = pngNear5Mb();
  expect(big.buffer.length).toBeGreaterThan(5 * 1024 * 1024 - 64 * 1024);
  expect(big.buffer.length).toBeLessThanOrEqual(5 * 1024 * 1024);
  await form.fileInput.setInputFiles(big);
  await form.waitUploads();
  // The ~5 MB file went through the Server Action (bodySizeLimit) and the api.
  await expect(page.getByText(t.photos.retry)).toHaveCount(0);
  await form.name.fill('Bolinha editado');
  expect(await seriousAxeViolations(page)).toEqual([]);
  await form.submit(true);
  await page.waitForURL('**/painel');

  const keys = bucketKeys(prefix);
  // Still 3 photos × 3 variants (T174).
  expect(keys).toHaveLength(9);
  expect(keys.some((key) => key.includes(removed!))).toBe(false);
  await page.goto(publicUrl);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bolinha editado' }),
  ).toBeVisible();

  // AFORM-15/16/17: delete from the edit page.
  await form.goto(animalId);
  await form.press(form.deleteButton);
  const dialog = form.dialog('Bolinha editado');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: t.delete.markUnavailable }),
  ).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);
  await form.press(
    dialog.getByRole('button', { name: t.delete.confirm, exact: true }),
  );
  await page.waitForURL('**/painel');
  await expect(dashboard.firstAnimalCta).toBeVisible();

  const gone = await page.goto(publicUrl);
  expect(gone?.status()).toBe(404);
  expect(bucketKeys(prefix)).toEqual([]);
});

test('SEC-06: animal de outra ONG ou id malformado no painel → 404', async ({
  page,
}) => {
  const form = new AnimalFormPage(page);
  await new LoginPage(page).goto();
  await new LoginPage(page).login(ngo.email, ngo.password);
  await page.waitForURL('**/painel');

  const foreign = await form.goto(otherAnimalId);
  expect(foreign?.status()).toBe(404);
  await expect(form.notFound).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  const malformed = await form.goto('nao-e-um-id');
  expect(malformed?.status()).toBe(404);
});
