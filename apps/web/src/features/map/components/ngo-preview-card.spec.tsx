import { render, screen } from '@testing-library/react';
import { mapDictionary as t } from '../map.dictionary';
import { makeRankedNgo } from '../test-fixtures';
import { NgoPreviewCard } from './ngo-preview-card';

describe('NgoPreviewCard', () => {
  it('MAP-05: nome, "Aberta agora", horário de hoje e distância', () => {
    render(<NgoPreviewCard ngo={makeRankedNgo({ distanceKm: 1.2 })} />);

    expect(
      screen.getByRole('heading', { name: 'Patas do Bairro' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aberta agora')).toBeInTheDocument();
    expect(screen.getByText('Hoje, 09:00 às 18:00')).toBeInTheDocument();
    expect(screen.getByText('1,2 km')).toBeInTheDocument();
  });

  it('MAP-06: "Ver ONG e animais" leva a /ong/patas-do-bairro', () => {
    render(<NgoPreviewCard ngo={makeRankedNgo()} />);

    expect(
      screen.getByRole('link', { name: 'Ver ONG e animais' }),
    ).toHaveAttribute('href', '/ong/patas-do-bairro');
  });

  it('MAP-05: ONG fechada mostra "Fechada"', () => {
    render(<NgoPreviewCard ngo={makeRankedNgo({ openNow: false })} />);

    expect(screen.getByText('Fechada')).toBeInTheDocument();
    expect(screen.queryByText('Aberta agora')).not.toBeInTheDocument();
  });

  it.each([
    ['fechada o dia todo', { closed: true, opensAt: null, closesAt: null }],
    ['sem horário cadastrado', null],
  ])('%s → "Fechada hoje"', (_, todayHours) => {
    render(<NgoPreviewCard ngo={makeRankedNgo({ todayHours })} />);

    expect(screen.getByText(t.preview.closedToday)).toBeInTheDocument();
  });

  it('PERF-02: a imagem tem width, height e loading="lazy"', () => {
    const { container } = render(
      <NgoPreviewCard
        ngo={makeRankedNgo({ thumbUrl: '/img/ngos/a/logo/b-160.webp' })}
      />,
    );
    const img = container.querySelector('img');

    expect(img).toHaveAttribute('src', '/img/ngos/a/logo/b-160.webp');
    expect(img).toHaveAttribute('width', '80');
    expect(img).toHaveAttribute('height', '80');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('sem imagem mostra o placeholder', () => {
    const { container } = render(
      <NgoPreviewCard ngo={makeRankedNgo({ thumbUrl: null })} />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(
      container.querySelector('[data-slot="ngo-thumb-placeholder"]'),
    ).toBeInTheDocument();
  });
});
