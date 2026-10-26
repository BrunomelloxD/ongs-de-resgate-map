import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeRankedNgo } from '../test-fixtures';
import { NgoList, type NgoListProps } from './ngo-list';

const PATAS = makeRankedNgo({ id: 'patas', distanceKm: 1.2 });
const GATIL = makeRankedNgo({
  id: 'gatil',
  slug: 'gatil-sete-vidas',
  name: 'Gatil Sete Vidas',
  openNow: false,
  distanceKm: 1.8,
});

function setup(props: Partial<NgoListProps> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onRetry: vi.fn(),
    onWiden: vi.fn(),
    onClearFilters: vi.fn(),
  };
  const view = render(
    <NgoList
      status="ready"
      items={[PATAS, GATIL]}
      radiusKm={5}
      filtered={false}
      truncated={false}
      selectedId={null}
      otherCityHref="/localizacao"
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
}

describe('NgoList', () => {
  it('T187: os filtros ficam entre o título e as ONGs', () => {
    setup({ filters: <p>filtros</p> });

    const title = screen.getByRole('heading', { name: '2 ONGs perto de você' });
    const filters = screen.getByText('filtros');
    expect(
      title.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      filters.compareDocumentPosition(screen.getByRole('list')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('MAP-12: carregando mostra o skeleton e "Buscando ONGs perto de você…"', () => {
    const { container } = setup({ status: 'loading', items: [] });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Buscando ONGs perto de você…',
    );
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('MAP-16: erro mostra "Não conseguimos carregar as ONGs." e "Tentar de novo"', async () => {
    const { onRetry } = setup({ status: 'error', items: [] });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não conseguimos carregar as ONGs.',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    );

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('MAP-13: vazio mostra "Ampliar raio" e "Buscar outra cidade"', async () => {
    const { onWiden } = setup({ status: 'empty', items: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Ampliar raio' }));

    expect(onWiden).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('link', { name: 'Buscar outra cidade' }),
    ).toHaveAttribute('href', '/localizacao');
    expect(
      screen.queryByRole('button', { name: 'Limpar filtros' }),
    ).not.toBeInTheDocument();
  });

  it('MAP-14: no raio máximo, o vazio não oferece "Ampliar raio"', () => {
    setup({ status: 'empty', items: [], onWiden: undefined });

    expect(
      screen.queryByRole('button', { name: 'Ampliar raio' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Buscar outra cidade' }),
    ).toBeInTheDocument();
  });

  it('MAP-13: ONGs da área todas fora do raio → mesmo estado vazio', () => {
    setup({ status: 'ready', items: [] });

    expect(
      screen.getByRole('button', { name: 'Ampliar raio' }),
    ).toBeInTheDocument();
  });

  it('MAPF-04: vazio por filtros mostra "Limpar filtros"', async () => {
    const { onClearFilters } = setup({
      status: 'ready',
      items: [],
      filtered: true,
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Limpar filtros' }),
    );

    expect(onClearFilters).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole('button', { name: 'Ampliar raio' }),
    ).not.toBeInTheDocument();
  });

  it('MAP-07: lista as ONGs na ordem recebida, com selo, distância e horário', () => {
    setup();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Patas do Bairro');
    expect(items[0]).toHaveTextContent('Aberta agora');
    expect(items[0]).toHaveTextContent('1,2 km');
    expect(items[0]).toHaveTextContent('Hoje, 09:00 às 18:00');
    expect(items[1]).toHaveTextContent('Gatil Sete Vidas');
    expect(items[1]).toHaveTextContent('Fechada');
    expect(
      screen.getByRole('heading', { name: '2 ONGs perto de você' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ordenadas pela distância · raio de 5 km'),
    ).toBeInTheDocument();
  });

  it('uma ONG só → "1 ONG perto de você"', () => {
    setup({ items: [PATAS] });

    expect(
      screen.getByRole('heading', { name: '1 ONG perto de você' }),
    ).toBeInTheDocument();
  });

  it('MAP-11: o item selecionado tem aria-current; os outros não', () => {
    setup({ selectedId: 'gatil' });

    expect(
      screen.getByRole('button', { name: /Gatil Sete Vidas/ }),
    ).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByRole('button', { name: /Patas do Bairro/ }),
    ).not.toHaveAttribute('aria-current');
  });

  it('A11Y-08: Tab chega a cada ONG e Enter a seleciona', async () => {
    const { onSelect } = setup();

    await userEvent.tab();
    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: /Gatil Sete Vidas/ }),
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('gatil');
  });

  it('mais de 200 ONGs → "Aproxime o mapa para ver todas as ONGs." (Edge Cases)', () => {
    setup({ truncated: true });

    expect(
      screen.getByText('Aproxime o mapa para ver todas as ONGs.'),
    ).toBeInTheDocument();
  });

  it('até 200 ONGs → sem o aviso', () => {
    setup();

    expect(
      screen.queryByText('Aproxime o mapa para ver todas as ONGs.'),
    ).not.toBeInTheDocument();
  });
});
