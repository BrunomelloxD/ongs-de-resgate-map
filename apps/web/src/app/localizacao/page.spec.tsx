import { render, screen, within } from '@testing-library/react';
import LocationRoute, { metadata } from './page';

vi.mock('@/features/location', () => ({
  LocationPage: () => <p>location-page</p>,
  locationDictionary: { metaTitle: 'Localização' },
}));

describe('/localizacao', () => {
  it('compõe o seletor de localização da feature', () => {
    render(<LocationRoute />);

    expect(screen.getByRole('main')).toHaveTextContent('location-page');
  });

  it('L-02: no desktop, a ilustração do mapa ocupa a metade direita; é decorativa', () => {
    const { container } = render(<LocationRoute />);
    const art = container.querySelector('[data-slot="location-map-art"]')!;
    const img = art.querySelector('img')!;

    expect(art).toHaveClass('hidden', 'lg:block');
    expect(screen.getByRole('main')).toHaveClass('lg:grid-cols-2');
    expect(img).toHaveAttribute('src', '/photos/location-map.webp');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '1440');
    expect(img).toHaveAttribute('height', '1640');
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Localização');
  });

  it('T196: a navbar marca "Mapa de ONGs" como página atual; o conteúdo é o #conteudo', () => {
    render(<LocationRoute />);
    const nav = within(screen.getByRole('banner')).getByRole('navigation', {
      name: 'Principal',
    });

    expect(
      within(nav).getByRole('link', { name: 'Mapa de ONGs' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo');
  });
});
