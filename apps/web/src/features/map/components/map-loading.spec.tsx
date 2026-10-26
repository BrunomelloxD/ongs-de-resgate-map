import { render, screen } from '@testing-library/react';
import { MapLoading } from './map-loading';

describe('MapLoading (T176, prévia 03-mapa-carregando-*)', () => {
  it('anuncia "Procurando ONGs perto de você…" sobre o fundo do mapa', () => {
    render(<MapLoading />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Procurando ONGs perto de você…',
    );
  });

  it('ocupa o lugar do mapa (flex-1), e a lista do desktop é só a moldura, fora da árvore de acessibilidade', () => {
    const { container } = render(<MapLoading />);
    const frame = container.querySelector('[data-slot="map-loading"]')!;

    expect(frame).toHaveClass('flex', 'min-h-0', 'flex-1');
    const aside = frame.querySelector('[data-slot="map-loading-list"]')!;
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(aside).toHaveClass('hidden', 'lg:flex', 'w-[440px]');
    expect(aside).toHaveTextContent('Buscando ONGs perto de você…');
  });
});
