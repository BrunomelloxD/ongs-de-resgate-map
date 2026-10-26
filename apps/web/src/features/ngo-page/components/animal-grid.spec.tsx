import { render, screen } from '@testing-library/react';
import { makeNgoAnimal } from '../test-fixtures';
import type { NgoAnimalPage } from '../ngo-page.types';
import { AnimalGrid, type AnimalGridProps } from './animal-grid';

const WHATSAPP = 'https://wa.me/5511987654321?text=Ol%C3%A1';

function pageOf(
  count: number,
  meta: Partial<NgoAnimalPage['meta']> = {},
): NgoAnimalPage {
  return {
    data: Array.from({ length: count }, (_, i) =>
      makeNgoAnimal({ id: `id-${i}`, name: `Animal ${i}` }),
    ),
    meta: { total: count, page: 1, limit: 12, last_page: 1, ...meta },
  };
}

function setup(props: Partial<AnimalGridProps> = {}) {
  return render(
    <AnimalGrid
      page={pageOf(2)}
      hasAnimals
      whatsappUrl={WHATSAPP}
      ngoName="Patas do Bairro"
      filters={<p>filtros</p>}
      animalHref={(id) => `/ong/patas/animais/${id}`}
      pageHref={(page) => `/ong/patas?page=${page}`}
      clearHref="/ong/patas"
      {...props}
    />,
  );
}

describe('AnimalGrid', () => {
  it('mostra os filtros e um card por animal, com o link de cada um', () => {
    setup();

    expect(screen.getByText('filtros')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Animal 1/ })).toHaveAttribute(
      'href',
      '/ong/patas/animais/id-1',
    );
  });

  it('NGO-08: ONG sem animais → convite para o WhatsApp, sem filtros', () => {
    setup({ hasAnimals: false, page: pageOf(0) });

    // T189 (O-07): the figcraft's texts.
    expect(
      screen.getByRole('heading', {
        name: 'A Patas do Bairro ainda não cadastrou animais',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Perguntar no WhatsApp' }),
    ).toHaveAttribute('href', WHATSAPP);
    expect(screen.queryByText('filtros')).not.toBeInTheDocument();
  });

  it('O-07: o convite fica num cartão centralizado, com o coração em pino e o botão pequeno outline', () => {
    const { container } = setup({ hasAnimals: false, page: pageOf(0) });

    expect(
      container.querySelector('[data-slot="empty-state"]'),
    ).toHaveAttribute('data-layout', 'card');
    expect(
      screen.getByRole('link', { name: 'Perguntar no WhatsApp' }).className,
    ).toContain('border-fg');
  });

  it('O-05: o subtítulo conta os animais e os disponíveis', () => {
    setup({ counts: { total: 12, available: 9 } });
    expect(
      screen.getByText('12 animais · 9 disponíveis agora'),
    ).toBeInTheDocument();
  });

  it('O-05: no singular, "1 animal · 1 disponível agora"; sem animais, sem contagem', () => {
    const { unmount } = setup({ counts: { total: 1, available: 1 } });
    expect(
      screen.getByText('1 animal · 1 disponível agora'),
    ).toBeInTheDocument();
    unmount();

    setup({
      hasAnimals: false,
      page: pageOf(0),
      counts: { total: 0, available: 0 },
    });
    expect(screen.queryByText(/disponíve/)).not.toBeInTheDocument();
  });

  it('NGO-09: filtros sem resultado → "Nenhum animal com esses filtros." e "Limpar filtros"', () => {
    setup({ page: pageOf(0) });

    expect(
      screen.getByRole('heading', { name: 'Nenhum animal com esses filtros.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Limpar filtros' }),
    ).toHaveAttribute('href', '/ong/patas');
    expect(screen.getByText('filtros')).toBeInTheDocument();
  });

  it('NGO-10: com mais de uma página, a paginação usa a URL', () => {
    setup({ page: pageOf(12, { total: 30, page: 2, last_page: 3 }) });

    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute(
      'href',
      '/ong/patas?page=1',
    );
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute(
      'href',
      '/ong/patas?page=3',
    );
  });

  it('uma página só → sem paginação', () => {
    setup();

    expect(
      screen.queryByRole('navigation', { name: 'Páginas de animais' }),
    ).not.toBeInTheDocument();
  });
});
