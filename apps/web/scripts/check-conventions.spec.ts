// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(import.meta.dirname, 'check-conventions.mjs');

function run(srcDir?: string) {
  const args = srcDir ? [script, srcDir] : [script];
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}

/** A throwaway src with one page; globals.css is read by the color rule. */
function fakeSrc(page: string) {
  const dir = mkdtempSync(join(tmpdir(), 'conventions-'));
  mkdirSync(join(dir, 'app'));
  writeFileSync(join(dir, 'app/globals.css'), '');
  writeFileSync(join(dir, 'app/page.tsx'), page);
  return dir;
}

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function check(page: string) {
  const dir = fakeSrc(page);
  dirs.push(dir);
  return run(dir);
}

describe('check-conventions: px-gutter (T166, PERF-05)', () => {
  it('fails on px-gutter and max-w-* in the same className', () => {
    const result = check(
      'export default () => <main className="mx-auto max-w-md px-gutter py-6" />;',
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'src/app/page.tsx: px-gutter junto de max-w-* no mesmo className',
    );
  });

  it('fails when both come in a className expression', () => {
    const result = check(
      "export default () => <main className={cn('mx-auto max-w-3xl', { x: true }, 'px-gutter')} />;",
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('px-gutter junto de max-w-*');
  });

  it('passes with the gutter on the full-width container and px-4 in the column', () => {
    const result = check(
      'export default () => <main className="px-gutter"><div className="mx-auto max-w-md px-4" /></main>;',
    );

    expect(result.status).toBe(0);
  });

  it('passes on the fixed code', () => {
    const result = run();

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
