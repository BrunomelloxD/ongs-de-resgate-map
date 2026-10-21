import { Logger, type INestApplicationContext } from '@nestjs/common';
import { runCleanup } from '../cleanup.js';

function appWith(run: () => Promise<unknown>) {
  return { get: vi.fn(() => ({ run })) } as unknown as INestApplicationContext;
}

describe('runCleanup', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('devolve 0 quando a limpeza termina', async () => {
    const run = vi.fn().mockResolvedValue({});

    expect(await runCleanup(appWith(run))).toBe(0);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('devolve 1 e registra o erro quando a limpeza falha', async () => {
    const error = new Error('banco fora');

    expect(await runCleanup(appWith(() => Promise.reject(error)))).toBe(1);
    expect(Logger.prototype.error).toHaveBeenCalledWith(error.stack);
  });

  it('devolve 1 também quando o erro não é um Error', async () => {
    expect(await runCleanup(appWith(() => Promise.reject('falhou')))).toBe(1);
    expect(Logger.prototype.error).toHaveBeenCalledWith('falhou');
  });
});
