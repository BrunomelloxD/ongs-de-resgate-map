import { expect, test, type Locator } from '@playwright/test';
import { homeDictionary as t } from '../src/features/home/home.dictionary';
import { seriousAxeViolations } from './axe';
import { HomePage } from './pages/home.page';
import { hasHorizontalScroll } from './support/layout';

// T185 (PERF-08, H-01, H-02, H-04): the welcome page of figcraft 01.
const box = async (locator: Locator) => (await locator.boundingBox())!;

/** Every photo of the page actually loaded (PERF-02: WebP from public/). */
async function photosLoaded(home: HomePage) {
  await home.forNgos.scrollIntoViewIfNeeded();
  return home.heroPhotos
    .locator('img')
    .evaluateAll((imgs) =>
      imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0),
    );
}

test.describe('em 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('hero em duas colunas, passos lado a lado e o bloco para ONGs antes do rodapé', async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.goto();

    const title = await box(home.title);
    const dog = await box(home.heroPhotos.first());
    expect(dog.x).toBeGreaterThan(title.x + title.width - 80);
    expect(dog.y).toBeLessThan(title.y + title.height);
    expect(await photosLoaded(home)).toBe(true);

    const steps = home.howItWorks.getByRole('listitem');
    const [first, last] = [await box(steps.first()), await box(steps.last())];
    expect(Math.abs(first.y - last.y)).toBeLessThanOrEqual(1);
    expect(last.x).toBeGreaterThan(first.x);

    await expect(
      home.forNgos.getByRole('link', { name: t.forNgos.signup }),
    ).toHaveAttribute('href', '/cadastro/sobre');
    await expect(
      home.forNgos.getByRole('link', { name: t.forNgos.login }),
    ).toHaveAttribute('href', '/entrar');
    const footer = await box(page.getByRole('contentinfo'));
    const block = await box(home.forNgos);
    expect(block.y + block.height).toBeLessThanOrEqual(footer.y + 1);

    expect(await seriousAxeViolations(page)).toEqual([]);
  });
});

test.describe('em 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('as fotos em pino ficam acima do título, sem rolagem horizontal', async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.goto();

    const title = await box(home.title);
    for (const photo of await home.heroPhotos.all()) {
      const { y } = await box(photo);
      expect(y).toBeLessThan(title.y);
    }
    const steps = home.howItWorks.getByRole('listitem');
    expect((await box(steps.last())).y).toBeGreaterThan(
      (await box(steps.first())).y,
    );
    expect(await photosLoaded(home)).toBe(true);
    expect(await hasHorizontalScroll(page)).toBe(false);

    expect(await seriousAxeViolations(page)).toEqual([]);
  });
});
