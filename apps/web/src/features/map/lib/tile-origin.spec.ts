import { tileOrigin } from './tile-origin';

describe('tileOrigin (PERF-04, T176)', () => {
  it('a origem do modelo de URL dos tiles, sem caminho nem marcadores', () => {
    expect(tileOrigin('https://tile.openstreetmap.org/{z}/{x}/{y}.png')).toBe(
      'https://tile.openstreetmap.org',
    );
  });

  it('o subdomínio {s} vira o primeiro, "a"', () => {
    expect(tileOrigin('https://{s}.tile.example.org/{z}/{x}/{y}.png')).toBe(
      'https://a.tile.example.org',
    );
  });
});
