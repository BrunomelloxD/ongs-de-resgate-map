import { withAdvisoryLock } from '../advisory-lock.js';

function fakeTx() {
  return { $executeRaw: vi.fn().mockResolvedValue(1) };
}

describe('withAdvisoryLock', () => {
  it('trava pg_advisory_xact_lock(hashtext(key)) com a chave como parâmetro', async () => {
    const tx = fakeTx();

    await withAdvisoryLock(tx, 'quota:ngos');

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = tx.$executeRaw.mock.calls[0] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    expect(strings.join('?')).toBe('SELECT pg_advisory_xact_lock(hashtext(?))');
    expect(values).toEqual(['quota:ngos']);
  });

  it('nunca interpola a chave no texto do SQL', async () => {
    const tx = fakeTx();
    const key = "quota:animals:x'); DROP TABLE ngos; --";

    await withAdvisoryLock(tx, key);

    const [strings, ...values] = tx.$executeRaw.mock.calls[0] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    expect(strings.join('')).not.toContain('quota:animals');
    expect(values).toEqual([key]);
  });

  it('espera o lock antes de devolver', async () => {
    let release!: () => void;
    const tx = {
      // PrismaPromise is lazy: an un-awaited lock would never even run.
      $executeRaw: vi.fn(
        (): any =>
          new Promise<number>((resolve) => (release = () => resolve(1))),
      ),
    };
    let done = false;

    const pending = withAdvisoryLock(tx, 'quota:storage').then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);

    release();
    await pending;
    expect(done).toBe(true);
  });
});
