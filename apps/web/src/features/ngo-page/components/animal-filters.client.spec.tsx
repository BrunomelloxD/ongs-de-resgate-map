import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_ANIMAL_FILTERS } from '../animal-filters';
import { AnimalFilters } from './animal-filters.client';

function setup(value = DEFAULT_ANIMAL_FILTERS) {
  const onChange = vi.fn();
  render(<AnimalFilters value={value} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe('AnimalFilters', () => {
  it('NGO-05: "Só disponíveis" começa ligado e nenhum chip pressionado', () => {
    setup();

    expect(
      screen.getByRole('switch', { name: 'Só disponíveis' }),
    ).toBeChecked();
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  });

  it('NGO-06: escolher espécie, sexo e porte soma os filtros', async () => {
    const { onChange, user } = setup({ species: 'CAT', available: true });

    expect(screen.getByRole('button', { name: 'Gato' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Fêmea' }));
    expect(onChange).toHaveBeenLastCalledWith({
      species: 'CAT',
      sex: 'FEMALE',
      available: true,
    });

    await user.click(screen.getByRole('button', { name: 'Pequeno' }));
    expect(onChange).toHaveBeenLastCalledWith({
      species: 'CAT',
      size: 'SMALL',
      available: true,
    });
  });

  it('tocar no chip escolhido tira o filtro', async () => {
    const { onChange, user } = setup({ species: 'CAT', available: true });

    await user.click(screen.getByRole('button', { name: 'Gato' }));

    expect(onChange).toHaveBeenLastCalledWith({
      species: undefined,
      available: true,
    });
  });

  it('NGO-07: desligar "Só disponíveis" pede available=false', async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole('switch', { name: 'Só disponíveis' }));

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
});
