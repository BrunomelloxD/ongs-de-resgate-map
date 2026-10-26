import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { HERO_PHOTOS, HeroArt } from './hero-art';

const PUBLIC = join(import.meta.dirname, '../../../../public');

describe('HeroArt', () => {
  it('H-01: o cão e o gato aparecem recortados em pino, como ilustração', () => {
    const { container } = render(<HeroArt />);
    const art = container.querySelector('[data-slot="hero-art"]')!;
    const pins = art.querySelectorAll('[data-slot="pin-photo"]');

    expect(art).toHaveAttribute('aria-hidden', 'true');
    expect(pins).toHaveLength(2);
    expect(pins[0]!.querySelector('img')).toHaveAttribute(
      'src',
      HERO_PHOTOS.dog.src,
    );
    expect(pins[1]!.querySelector('img')).toHaveAttribute(
      'src',
      HERO_PHOTOS.cat,
    );
  });

  it('PERF-02: as fotos são WebP em public/, com width, height e alt', () => {
    const { container } = render(<HeroArt />);
    const images = [...container.querySelectorAll('img')];

    expect(images).toHaveLength(3);
    for (const img of images) {
      expect(img.getAttribute('src')).toMatch(/^\/photos\/.+\.webp$/);
      expect(existsSync(join(PUBLIC, img.getAttribute('src')!))).toBe(true);
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
      expect(img).toHaveAttribute('alt', '');
    }
    for (const file of [
      HERO_PHOTOS.dog.small,
      HERO_PHOTOS.shelter.src,
      HERO_PHOTOS.shelter.pin,
    ])
      expect(existsSync(join(PUBLIC, file))).toBe(true);
  });

  it('PERF-04: a foto do cão é o LCP: sem lazy, com prioridade alta e a versão pequena no celular', () => {
    const { container } = render(<HeroArt />);
    const dog = container.querySelector(`img[src="${HERO_PHOTOS.dog.src}"]`)!;

    expect(dog).not.toHaveAttribute('loading');
    expect(dog).toHaveAttribute('fetchpriority', 'high');
    expect(dog.getAttribute('srcset')).toContain(
      `${HERO_PHOTOS.dog.small} 520w`,
    );
    expect(dog.getAttribute('sizes')).toMatch(/290px$/);
  });

  it('H-01: no desktop, o card de ONG flutua; no celular, o selo com o nome e a distância', () => {
    const { container } = render(<HeroArt />);
    const card = container.querySelector('[data-slot="ngo-list-card"]')!;

    expect(card).toHaveClass('hidden', 'xl:flex');
    expect(card).toHaveTextContent('Patas do Bairro');
    expect(card).toHaveTextContent('Aberta agora');
    expect(card).toHaveTextContent('Hoje, 9h às 18h');
    expect(card.querySelector('img')).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText('Patas do Bairro · 1,2 km')).toHaveClass(
      'xl:hidden',
    );
  });
});
