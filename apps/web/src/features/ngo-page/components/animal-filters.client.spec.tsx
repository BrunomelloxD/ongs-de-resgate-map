import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_ANIMAL_FILTERS } from '../animal-filters';
import { AnimalFilters } from './animal-filters.client';

function setup(value = DEFAULT_ANIMAL_FILTERS) {
  const onChange = vi.fn();
  render(<AnimalFilters value={value} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

// T189 (O-06): species, sex and size are dropdown chips (native selects);
// "Só disponíveis" is a toggle chip.
const select = (name: string) => screen.getByRole('combobox', { name });
const onlyAvailable = () =>
  screen.getByRole('button', { name: 'Só disponíveis' });

describe('AnimalFilters', () => {
  it('NGO-05: "Só disponíveis" começa ligado e nenhum chip pressionado', () => {
    setup();

    expect(onlyAvailable()).toHaveAttribute('aria-pressed', 'true');
    expect(select('Espécie')).toHaveValue('');
    expect(select('Sexo')).toHaveValue('');
    expect(select('Porte')).toHaveValue('');
  });

  it('O-06: "Espécie ▾", "Sexo ▾", "Porte ▾" e "✓ Só disponíveis" numa linha; o chip mostra o rótulo ou o escolhido', () => {
    setup({ species: 'CAT', available: true });
    const row = document.querySelector('[data-slot="animal-filters-row"]')!;

    expect(row.children).toHaveLength(4);
    expect(row.children[0]).toHaveTextContent('Gato');
    expect(row.children[0]).toHaveAttribute('data-active', 'true');
    expect(row.children[1]).toHaveTextContent('Sexo');
    expect(row.children[1]).not.toHaveAttribute('data-active');
  });

  it('NGO-06: escolher espécie, sexo e porte soma os filtros', async () => {
    const { onChange, user } = setup({ species: 'CAT', available: true });

    expect(select('Espécie')).toHaveValue('CAT');
    await user.selectOptions(select('Sexo'), 'FEMALE');
    expect(onChange).toHaveBeenLastCalledWith({
      species: 'CAT',
      sex: 'FEMALE',
      available: true,
    });

    await user.selectOptions(select('Porte'), 'SMALL');
    expect(onChange).toHaveBeenLastCalledWith({
      species: 'CAT',
      size: 'SMALL',
      available: true,
    });
  });

  it('tocar no chip escolhido tira o filtro', async () => {
    const { onChange, user } = setup({ species: 'CAT', available: true });

    // T189: "Todas as espécies" in the dropdown clears it.
    await user.selectOptions(select('Espécie'), '');

    expect(onChange).toHaveBeenLastCalledWith({
      species: undefined,
      available: true,
    });
  });

  it('NGO-07: desligar "Só disponíveis" pede available=false', async () => {
    const { onChange, user } = setup();

    await user.click(onlyAvailable());

    expect(onChange).toHaveBeenLastCalledWith({ available: false });
  });

  it('"Limpar filtros" volta ao padrão', async () => {
    const { onChange, user } = setup({
      species: 'DOG',
      sex: 'MALE',
      available: false,
    });

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onChange).toHaveBeenLastCalledWith({ available: true });
  });

  it('no padrão, sem "Limpar filtros"', () => {
    setup();

    expect(
      screen.queryByRole('button', { name: 'Limpar filtros' }),
    ).not.toBeInTheDocument();
  });
});
