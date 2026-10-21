import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveRegion } from '@/components/ui/live-region.client';
import { MIXED_ANIMALS } from '../test-fixtures';
import { AnimalList } from './animal-list.client';

function renderList() {
  render(
    <LiveRegion>
      <AnimalList animals={MIXED_ANIMALS} onToggle={vi.fn()} />
    </LiveRegion>,
  );
}

const names = () =>
  within(screen.getByRole('list'))
    .getAllByRole('heading')
    .map((heading) => heading.textContent);

const chip = (name: string) => screen.getByRole('button', { name });

describe('AnimalList', () => {
  it('DASH-01: começa com todos os animais e "Todos" marcado', () => {
    renderList();

    expect(names()).toEqual(['João', 'Mel', 'Joana', 'Paçoca']);
    expect(chip('Todos')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveAttribute(
      'placeholder',
      'Buscar pelo nome…',
    );
  });

  it('DASH-04: "joao" acha "João", sem acento e sem caixa', async () => {
    renderList();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar' }),
      'joao',
    );

    expect(names()).toEqual(['João']);
  });

  it('DASH-04: "PAÇ" acha "Paçoca"; a busca é por parte do nome', async () => {
    renderList();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar' }),
      'PAÇ',
    );

    expect(names()).toEqual(['Paçoca']);
  });

  it('DASH-05: "Gatos" mostra só gatos', async () => {
    renderList();

    await userEvent.click(chip('Gatos'));

    expect(names()).toEqual(['Mel', 'Joana']);
    expect(chip('Gatos')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Todos')).toHaveAttribute('aria-pressed', 'false');
  });

  it.each([
    ['Cães', ['João', 'Paçoca']],
    ['Disponíveis', ['João', 'Mel']],
    ['Indisponíveis', ['Joana', 'Paçoca']],
  ])(
    'DASH-05: "%s" mostra só os que atendem ao filtro',
    async (filter, expected) => {
      renderList();

      await userEvent.click(chip(filter));

      expect(names()).toEqual(expected);
    },
  );

  it('DASH-04/05: busca + filtro combinam', async () => {
    renderList();

    await userEvent.click(chip('Gatos'));
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar' }),
      'jo',
    );

    expect(names()).toEqual(['Joana']);
  });

  it('tocar no filtro marcado volta para "Todos"', async () => {
    renderList();

    await userEvent.click(chip('Gatos'));
    await userEvent.click(chip('Gatos'));

    expect(chip('Todos')).toHaveAttribute('aria-pressed', 'true');
    expect(names()).toHaveLength(4);
  });

  it('nenhum resultado mostra "Nenhum animal encontrado."', async () => {
    renderList();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar' }),
      'rex',
    );

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum animal encontrado.')).toBeInTheDocument();
  });
});
