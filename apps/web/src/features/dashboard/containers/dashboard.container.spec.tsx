import { render, screen } from '@testing-library/react';
import type { AnimalListProps } from '../components/animal-list.client';
import type { FirstAccessProps } from '../components/first-access';
import { makeMyAnimal, makeMyNgo } from '../test-fixtures';
import { DashboardContainer } from './dashboard.container';

const getMyAnimals = vi.hoisted(() => vi.fn());
const toggleAvailability = vi.hoisted(() => vi.fn());
const list = vi.hoisted(() => ({
  props: undefined as unknown as AnimalListProps,
}));

vi.mock('../queries/get-my-animals', () => ({ getMyAnimals }));
vi.mock('../actions/toggle-availability', () => ({ toggleAvailability }));
vi.mock('../components/first-access', () => ({
  FirstAccess: ({ ngo, animalCount }: FirstAccessProps) => (
    <p>
      primeiro acesso {ngo.legalName} {animalCount}
    </p>
  ),
}));
vi.mock('../components/animal-list.client', () => ({
  AnimalList: (props: AnimalListProps) => {
    list.props = props;
    return <p>lista {props.animals.length}</p>;
  },
}));

describe('DashboardContainer', () => {
  it('DASH-07: 0 animais → primeiro acesso, sem a lista', async () => {
    getMyAnimals.mockResolvedValue([]);

    render(await DashboardContainer({ ngo: makeMyNgo() }));

    expect(
      screen.getByText('primeiro acesso Patas do Bairro 0'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^lista/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Cadastrar animal' }),
    ).not.toBeInTheDocument();
  });

  it('DASH-01/06: 2 animais → lista, resumo e "Cadastrar animal" para /painel/animais/novo', async () => {
    const animals = [
      makeMyAnimal({ id: 'a0000000-0000-4000-8000-000000000001' }),
      makeMyAnimal({
        id: 'a0000000-0000-4000-8000-000000000002',
        name: 'Nina',
        available: false,
      }),
    ];
    getMyAnimals.mockResolvedValue(animals);

    render(await DashboardContainer({ ngo: makeMyNgo() }));

    expect(screen.getByText('lista 2')).toBeInTheDocument();
    expect(list.props.animals).toEqual(animals);
    expect(list.props.onToggle).toBe(toggleAvailability);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Seus animais' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('2 cadastrados · 1 disponível para adoção'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Cadastrar animal' }),
    ).toHaveAttribute('href', '/painel/animais/novo');
    expect(screen.queryByText(/^primeiro acesso/)).not.toBeInTheDocument();
  });

  it('resumo no singular e no plural', async () => {
    getMyAnimals.mockResolvedValue([makeMyAnimal()]);

    render(await DashboardContainer({ ngo: makeMyNgo() }));

    expect(
      screen.getByText('1 cadastrado · 1 disponível para adoção'),
    ).toBeInTheDocument();
  });

  it('resumo com vários disponíveis', async () => {
    getMyAnimals.mockResolvedValue([
      makeMyAnimal({ id: 'a0000000-0000-4000-8000-000000000001' }),
      makeMyAnimal({ id: 'a0000000-0000-4000-8000-000000000002' }),
    ]);

    render(await DashboardContainer({ ngo: makeMyNgo() }));

    expect(
      screen.getByText('2 cadastrados · 2 disponíveis para adoção'),
    ).toBeInTheDocument();
  });
});
