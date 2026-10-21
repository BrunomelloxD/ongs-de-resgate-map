import { existsSync } from 'node:fs';
import path from 'node:path';

const localFont = vi.hoisted(() =>
  vi.fn((options: { variable: string }) => ({
    variable: `cls${options.variable}`,
  })),
);
vi.mock('next/font/local', () => ({ default: localFont }));

describe('fonts', () => {
  it('carrega Bricolage Grotesque e Figtree de woff2 locais, sem download', async () => {
    const { bricolage, figtree } = await import('./fonts');

    expect(bricolage.variable).toBe('cls--font-bricolage');
    expect(figtree.variable).toBe('cls--font-figtree');
    expect(localFont).toHaveBeenCalledTimes(2);

    for (const [options] of localFont.mock.calls) {
      const { src, display } = options as unknown as {
        src: string;
        display: string;
      };

      expect(src).toMatch(/\.woff2$/);
      expect(display).toBe('swap');
      expect(existsSync(path.join(__dirname, src))).toBe(true);
    }
  });
});
