import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnimalFiltersNav } from './animal-filters-nav.client';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/ong/patas-do-bairro',
}));

describe('AnimalFiltersNav', () => {
  it('NGO-06: um filtro novo vira search param, de volta à página 1', async () => {
    render(<AnimalFiltersNav value={{ species: 'CAT', available: true }} />);

    // T189 (O-06): sex is a dropdown chip.
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Sexo' }),
      'FEMALE',
    );

    expect(push).toHaveBeenCalledWith(
      '/ong/patas-do-bairro?species=CAT&sex=FEMALE',
      { scroll: false },
    );
  });

  it('NGO-07: desligar "Só disponíveis" grava available=false', async () => {
    render(<AnimalFiltersNav value={{ available: true }} />);

    // T189 (O-06): "Só disponíveis" is a toggle chip.
    await userEvent.click(
      screen.getByRole('button', { name: 'Só disponíveis' }),
    );

    expect(push).toHaveBeenLastCalledWith(
      '/ong/patas-do-bairro?available=false',
      { scroll: false },
    );
  });
});
