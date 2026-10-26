import { render, screen, within } from '@testing-library/react';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  it('tem o logo para a home e os links do figcraft com os href certos', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');

    expect(
      within(banner).getByRole('link', { name: 'Animal Helper' }),
    ).toHaveAttribute('href', '/');
    const nav = within(banner).getByRole('navigation', { name: 'Principal' });
    expect(
      within(nav).getByRole('link', { name: 'Como funciona' }),
    ).toHaveAttribute('href', '/#como-funciona');
    expect(
      within(nav).getByRole('link', { name: 'Mapa de ONGs' }),
    ).toHaveAttribute('href', '/localizacao');
    expect(
      within(nav).getByRole('link', { name: 'Sou uma ONG' }),
    ).toHaveAttribute('href', '/entrar');
  });

  it('no celular só o "Sou uma ONG" sublinhado; no desktop, em outline', () => {
    render(<SiteHeader />);
    const ngo = screen.getByRole('link', { name: 'Sou uma ONG' });

    expect(ngo.className).toContain('underline');
    expect(ngo.className).toContain('lg:no-underline');
    expect(ngo.className).toContain('lg:border-fg');
    for (const name of ['Como funciona', 'Mapa de ONGs']) {
      const link = screen.getByRole('link', { name });
      expect(link.className).toContain('hidden');
      expect(link.className).toContain('lg:inline-flex');
    }
  });

  it('todos os links têm alvo de 44 px (A11Y-02)', () => {
    render(<SiteHeader />);

    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toContain('touch-target');
    }
  });

  it('desktopOnly esconde o cabeçalho no celular', () => {
    render(<SiteHeader desktopOnly className="extra" />);

    expect(screen.getByRole('banner').className).toContain('max-lg:hidden');
    expect(screen.getByRole('banner').className).toContain('extra');
  });
});
