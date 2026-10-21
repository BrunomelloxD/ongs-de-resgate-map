import { render, screen } from '@testing-library/react';
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

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Localização');
  });
});
