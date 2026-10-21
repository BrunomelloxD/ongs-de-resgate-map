import { render, screen } from '@testing-library/react';
import HomePage from './page';

vi.mock('@/features/home', () => ({
  HomeHero: () => <p>home-hero</p>,
}));

describe('HomePage', () => {
  it('compõe a feature home (HOME-01)', () => {
    render(<HomePage />);

    expect(screen.getByText('home-hero')).toBeInTheDocument();
  });
});
