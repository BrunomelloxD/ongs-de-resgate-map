import { render, screen } from '@testing-library/react';
import { MapColumnHeader } from './map-column-header';

describe('MapColumnHeader', () => {
  it('M-02: o logo leva à home e "Sou uma ONG" ao login (HOME-03)', () => {
    render(<MapColumnHeader />);

    expect(screen.getByRole('link', { name: 'Animal Helper' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Sou uma ONG' })).toHaveAttribute(
      'href',
      '/entrar',
    );
  });
});
