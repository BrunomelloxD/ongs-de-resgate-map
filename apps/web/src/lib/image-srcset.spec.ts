import { animalSrcSet } from './image-srcset';

describe('animalSrcSet (PERF-02, T175)', () => {
  it('lista as variantes de 160, 600 e 1200 px da api com a largura de cada uma', () => {
    expect(
      animalSrcSet({
        thumbUrl: '/img/ngos/n/images/a-160.webp',
        mediumUrl: '/img/ngos/n/images/a-600.webp',
        url: '/img/ngos/n/images/a-1200.webp',
      }),
    ).toBe(
      '/img/ngos/n/images/a-160.webp 160w, /img/ngos/n/images/a-600.webp 600w, /img/ngos/n/images/a-1200.webp 1200w',
    );
  });
});
